import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const RiskDashboard = () => {
  // 模拟已添加的企业数据
  const [companies, setCompanies] = useState([
    {
      id: 1,
      name: '北京智源科技有限公司',
      riskLevel: '中风险',
      overallRiskScore: 65,
      lastUpdated: '2小时前',
      alerts: 3,
      legalCases: 2,
      mediaReports: 5
    },
    {
      id: 2,
      name: '上海创新网络技术有限公司',
      riskLevel: '低风险',
      overallRiskScore: 25,
      lastUpdated: '1天前',
      alerts: 1,
      legalCases: 0,
      mediaReports: 3
    },
    {
      id: 3,
      name: '广州未来科技发展有限公司',
      riskLevel: '高风险',
      overallRiskScore: 85,
      lastUpdated: '30分钟前',
      alerts: 8,
      legalCases: 5,
      mediaReports: 12
    },
    {
      id: 4,
      name: '深圳智能硬件有限公司',
      riskLevel: '中风险',
      overallRiskScore: 55,
      lastUpdated: '5小时前',
      alerts: 2,
      legalCases: 1,
      mediaReports: 4
    }
  ]);

  // 模拟风险指标数据
  const riskIndicators = [
    { id: 1, name: '经营状况', level: '低', change: '+2%', color: 'bg-green-500' },
    { id: 2, name: '法律纠纷', level: '中', change: '-5%', color: 'bg-yellow-500' },
    { id: 3, name: '高管变动', level: '高', change: '+15%', color: 'bg-red-500' },
    { id: 4, name: '供应链风险', level: '低', change: '0%', color: 'bg-green-500' },
  ];

  // 模拟最近警报数据
  const alerts = [
    { id: 1, company: '广州未来科技发展有限公司', type: '高管离职', severity: '高', time: '30分钟前', source: '微博' },
    { id: 2, company: '北京智源科技有限公司', type: '供应商违约', severity: '中', time: '2小时前', source: '新闻' },
    { id: 3, company: '上海创新网络技术有限公司', type: '负面舆情', severity: '低', time: '5小时前', source: '知乎' },
  ];

  const getRiskLevelColor = (level) => {
    switch(level) {
      case '低风险': return 'text-green-600 bg-green-100';
      case '中风险': return 'text-yellow-600 bg-yellow-100';
      case '高风险': return 'text-orange-600 bg-orange-100';
      case '极高风险': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Upload Button - Fixed to bottom right corner */}
          <div className="fixed bottom-6 right-6 z-50">
            <Link to="/company-management" className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </Link>
          </div>

          {/* Risk Indicators */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">风险指标概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {riskIndicators.map((indicator) => (
                <div key={indicator.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${indicator.color} mr-2`}></div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">{indicator.name}</h3>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{indicator.level}</p>
                    <p className={`mt-1 text-sm ${indicator.change.startsWith('+') ? 'text-red-600' : indicator.change.startsWith('-') ? 'text-green-600' : 'text-gray-500'}`}>
                      {indicator.change} 变化
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company Cards Grid */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">企业风险监控</h2>
              <Link 
                to="/company-management"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                添加企业
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div key={company.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{company.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(company.riskLevel)}`}>
                        {company.riskLevel}
                      </span>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        更新于 {company.lastUpdated}
                      </div>

                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        风险评分: {company.overallRiskScore}
                      </div>

                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        警报: {company.alerts} 个
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        法律案件: {company.legalCases} 个, 媒体报道: {company.mediaReports} 篇
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Link 
                        to={`/company/${company.id}`} 
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        查看详情
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">最新风险警报</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-blue-600 truncate">{alert.company}</div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.severity === '高' ? 'bg-red-100 text-red-800' :
                          alert.severity === '中' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.severity}风险
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm text-gray-900">{alert.type}</div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>{alert.time}</span>
                          <span className="mx-2">•</span>
                          <span>来源: {alert.source}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RiskDashboard;