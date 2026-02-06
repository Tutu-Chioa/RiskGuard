import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const AddCompanyPage = () => {
  const [companyName, setCompanyName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notificationPhone, setNotificationPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsLoading(true);

    try {
      // 第一步：调用后端API监控企业（获取企业基本信息）
      const token = localStorage.getItem('token');
      
      // 监控企业并获取详细信息
      const monitorResponse = await fetch('http://localhost:8001/api/monitor-company/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: companyName,
          email: notificationEmail,
          phone: notificationPhone
        })
      });

      if (!monitorResponse.ok) {
        const errorData = await monitorResponse.json();
        throw new Error(errorData.detail || '企业监控失败');
      }

      const result = await monitorResponse.json();
      
      // 第二步：触发媒体爬虫
      const mediaResponse = await fetch('http://localhost:8003/api/crawl-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          company_name: companyName,
          keywords: [companyName, ...(result.company_info.business_scope || '').split(' ')].filter(k => k.trim() !== ''),
          platforms: ["weibo", "zhihu", "news", "xiaohongshu"]
        })
      });

      if (!mediaResponse.ok) {
        const errorData = await mediaResponse.json();
        console.warn(`媒体爬取失败: ${errorData.detail || '未知错误'}`);
        // 即使媒体爬取失败，也不中断流程，因为基本信息已获取
      } else {
        const mediaResult = await mediaResponse.json();
        console.log(`媒体爬取结果: ${mediaResult.message}`);
      }

      alert(`企业 "${companyName}" 已成功添加到监控列表！\n已完成基本信息获取和媒体舆情分析。`);
      navigate('/');
    } catch (error) {
      alert(`操作失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">添加企业</h1>
            <p className="mt-1 text-sm text-gray-600">
              输入企业名称以开始监控其风险状况
            </p>
          </div>

          {/* 添加企业表单 */}
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  企业名称 *
                </label>
                <input
                  type="text"
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  placeholder="请输入企业全称"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  请输入完整的企业名称以便准确获取信息
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱通知
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="可选，高风险时接收邮件通知"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    短信通知
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={notificationPhone}
                    onChange={(e) => setNotificationPhone(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="可选，高风险时接收短信通知"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </Link>
                
                <button
                  type="submit"
                  disabled={isLoading || !companyName.trim()}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      添加中...
                    </>
                  ) : (
                    '添加企业'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 添加企业的好处说明 */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">添加企业后您可以：</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-4 w-4 text-blue-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm text-gray-700">实时监控企业风险状况</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-4 w-4 text-blue-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm text-gray-700">获取详细的财务、法律和声誉风险分析</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-4 w-4 text-blue-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm text-gray-700">查看法律案件和媒体报道趋势</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-4 w-4 text-blue-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm text-gray-700">设置自定义风险阈值和通知方式</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-4 w-4 text-blue-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-3 text-sm text-gray-700">生成专业的风险评估报告</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddCompanyPage;