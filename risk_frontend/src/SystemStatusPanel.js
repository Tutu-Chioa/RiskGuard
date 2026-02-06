import React, { useState, useEffect } from 'react';

const SystemStatusPanel = () => {
  const [services, setServices] = useState([
    { 
      id: 'main-api', 
      name: '主API服务', 
      endpoint: 'http://localhost:8001', 
      status: 'online', 
      lastCheck: new Date(Date.now() - 30000),
      responseTime: 120
    },
    { 
      id: 'user-api', 
      name: '用户API服务', 
      endpoint: 'http://localhost:8003', 
      status: 'online', 
      lastCheck: new Date(Date.now() - 45000),
      responseTime: 95
    },
    { 
      id: 'auth-api', 
      name: '认证服务', 
      endpoint: 'http://localhost:8005', 
      status: 'online', 
      lastCheck: new Date(Date.now() - 60000),
      responseTime: 87
    },
    { 
      id: 'crawler', 
      name: '企业信息爬虫', 
      endpoint: 'Internal', 
      status: 'online', 
      lastCheck: new Date(Date.now() - 120000),
      responseTime: null
    },
    { 
      id: 'media-crawler', 
      name: '媒体信息爬虫', 
      endpoint: 'Internal', 
      status: 'warning', 
      lastCheck: new Date(Date.now() - 180000),
      responseTime: null
    },
    { 
      id: 'document-analyzer', 
      name: '文档分析服务', 
      endpoint: 'Internal', 
      status: 'online', 
      lastCheck: new Date(Date.now() - 90000),
      responseTime: 340
    },
    { 
      id: 'notification', 
      name: '通知服务', 
      endpoint: 'Internal', 
      status: 'offline', 
      lastCheck: new Date(Date.now() - 240000),
      responseTime: null
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online': return '正常';
      case 'warning': return '警告';
      case 'offline': return '异常';
      default: return '未知';
    }
  };

  // 模拟定期检查服务状态
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(prevServices => 
        prevServices.map(service => ({
          ...service,
          lastCheck: new Date(),
          // 模拟状态变化
          status: service.id === 'notification' ? 'offline' : 
                 service.id === 'media-crawler' ? 'warning' : 'online'
        }))
      );
    }, 30000); // 每30秒更新一次

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        系统状态
      </h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {services.map((service) => (
          <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(service.status)}`}></div>
              <div>
                <div className="text-sm font-medium text-gray-800">{service.name}</div>
                <div className="text-xs text-gray-500">{service.endpoint}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs px-2 py-1 rounded-full ${
                service.status === 'online' ? 'bg-green-100 text-green-800' :
                service.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getStatusText(service.status)}
              </div>
              {service.responseTime && (
                <div className="text-xs text-gray-500 mt-1">{service.responseTime}ms</div>
              )}
              <div className="text-xs text-gray-400">
                {service.lastCheck.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>在线</span>
          <span>{services.filter(s => s.status === 'online').length}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>警告</span>
          <span>{services.filter(s => s.status === 'warning').length}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>异常</span>
          <span>{services.filter(s => s.status === 'offline').length}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPanel;