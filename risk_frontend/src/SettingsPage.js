import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { THEME_PRESETS } from './themePresets';
import AlertRulesSection from './AlertRulesSection';
import AuditLogSection from './AuditLogSection';

const SettingsPage = () => {
  const { user } = useAuth();
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useSettings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general'); // general, appearance, notifications, security, llm
  const language = globalSettings.language ?? 'zh-CN';
  const setLanguage = (v) => updateGlobalSettings({ language: typeof v === 'function' ? v(language) : v });
  const darkMode = globalSettings.darkMode;
  const setDarkMode = (v) => updateGlobalSettings({ darkMode: typeof v === 'function' ? v(darkMode) : v });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });
  const [alertThreshold, setAlertThreshold] = useState('high');
  const themeColor = globalSettings.themeColor;
  const setThemeColor = (v) => updateGlobalSettings({ themeColor: typeof v === 'function' ? v(themeColor) : v });
  const interfaceDensity = globalSettings.interfaceDensity;
  const setInterfaceDensity = (v) => updateGlobalSettings({ interfaceDensity: typeof v === 'function' ? v(interfaceDensity) : v });
  const fontSize = globalSettings.fontSize;
  const setFontSize = (v) => updateGlobalSettings({ fontSize: typeof v === 'function' ? v(fontSize) : v });
  const autoRefresh = globalSettings.autoRefresh !== false;
  const setAutoRefresh = (v) => updateGlobalSettings({ autoRefresh: typeof v === 'function' ? v(autoRefresh) : v });
  const refreshInterval = globalSettings.refreshInterval ?? 30;
  const setRefreshInterval = (v) => updateGlobalSettings({ refreshInterval: typeof v === 'function' ? v(refreshInterval) : v });
  const dateFormat = globalSettings.dateFormat ?? 'yyyy-mm-dd';
  const setDateFormat = (v) => updateGlobalSettings({ dateFormat: typeof v === 'function' ? v(dateFormat) : v });
  const timeFormat = globalSettings.timeFormat ?? '24h';
  const setTimeFormat = (v) => updateGlobalSettings({ timeFormat: typeof v === 'function' ? v(timeFormat) : v });
  const dataRetention = globalSettings.dataRetention ?? 365;
  const setDataRetention = (v) => updateGlobalSettings({ dataRetention: typeof v === 'function' ? v(dataRetention) : v });
  const doNotDisturb = globalSettings.doNotDisturb === true;
  const setDoNotDisturb = (v) => updateGlobalSettings({ doNotDisturb: typeof v === 'function' ? v(doNotDisturb) : v });
  const notificationStart = globalSettings.notificationStart ?? '08:00';
  const setNotificationStart = (v) => updateGlobalSettings({ notificationStart: typeof v === 'function' ? v(notificationStart) : v });
  const notificationEnd = globalSettings.notificationEnd ?? '22:00';
  const setNotificationEnd = (v) => updateGlobalSettings({ notificationEnd: typeof v === 'function' ? v(notificationEnd) : v });
  const [twoFactor, setTwoFactor] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('weekly');
  const [message, setMessage] = useState('');
  const [llmConfig, setLlmConfig] = useState({ api_key: '', base_url: '', model: 'gpt-4o-mini', enable_web_search: false });
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [searchInterval, setSearchInterval] = useState(30);
  const [reportTemplate, setReportTemplate] = useState('');
  const [crawlerTabPlatform, setCrawlerTabPlatform] = useState('xhs');
  const [crawlerLoginStatus, setCrawlerLoginStatus] = useState(null);
  const [crawlerPath, setCrawlerPath] = useState('');
  const [crawlerPathSaving, setCrawlerPathSaving] = useState(false);
  const [crawlerPathMsg, setCrawlerPathMsg] = useState('');
  const [crawlerUploading, setCrawlerUploading] = useState(false);
  const [crawlerUploadMsg, setCrawlerUploadMsg] = useState('');
  const [crawlerTestResult, setCrawlerTestResult] = useState(null);
  const [crawlerTesting, setCrawlerTesting] = useState(false);
  const [crawlerTestKeyword, setCrawlerTestKeyword] = useState('美团');
  const [qrStarting, setQrStarting] = useState(false);
  const [qrcodeData, setQrcodeData] = useState(null);
  const [qrLoginSuccess, setQrLoginSuccess] = useState(false);
  const [qrPollCount, setQrPollCount] = useState(0);
  const [emailStatus, setEmailStatus] = useState({ smtp_configured: false, user_email: '', hint: '' });
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState('');
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false);
  const [twoFactorDisableOpen, setTwoFactorDisableOpen] = useState(false);
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('');
  const [twoFactorDisableConfirm, setTwoFactorDisableConfirm] = useState('');
  const [twoFactorDisableLoading, setTwoFactorDisableLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState(null);

  // 加载搜索间隔与报告格式
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/settings/search-interval', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : {})
        .then(d => {
          setSearchInterval(d.search_interval_minutes ?? 30);
          setReportTemplate(d.report_template || '');
        })
        .catch(() => {});
    }
  }, []);

  const saveSearchInterval = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/settings/search-interval', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ search_interval_minutes: searchInterval, report_template: reportTemplate })
      });
      const data = await res.json();
      setMessage(res.ok ? (data.message || '已保存') : (data.message || '保存失败'));
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('保存失败: ' + e.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // 加载邮件通知状态（进入通知 tab 时）
  useEffect(() => {
    if (activeTab !== 'notifications') return;
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/notifications/email-status', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : {})
        .then(d => setEmailStatus({ smtp_configured: !!d.smtp_configured, user_email: d.user_email || '', hint: d.hint || '' }))
        .catch(() => {});
    }
  }, [activeTab]);

  // 加载 LLM 配置
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/llm-config', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.resolve({}))
        .then(c => setLlmConfig({ api_key: c.api_key || '', base_url: c.base_url || '', model: c.model || 'gpt-4o-mini', enable_web_search: !!c.enable_web_search }))
        .catch(() => {});
    }
  }, []);

  const saveLlmConfig = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/llm-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...llmConfig, enable_web_search: llmConfig.enable_web_search })
      });
      const data = await res.json();
      setMessage(res.ok ? (data.message || 'LLM 配置已保存') : (data.message || '保存失败'));
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('保存失败: ' + e.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const testLlmCompany = async () => {
    setTesting(true);
    setTestResult(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/test-llm-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: '美团' })
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, data });
    } catch (e) {
      setTestResult({ ok: false, data: { error: e.message } });
    } finally {
      setTesting(false);
    }
  };

  // 媒体爬虫：登录状态 + 项目路径配置
  useEffect(() => {
    if (activeTab !== 'crawler') return;
    const token = localStorage.getItem('token');
    fetch(`/api/mediacrawler/login-status?platform=${crawlerTabPlatform}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : {})
      .then(d => setCrawlerLoginStatus(d))
      .catch(() => setCrawlerLoginStatus(null));
    fetch('/api/mediacrawler/config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : {})
      .then(d => setCrawlerPath(d.path || ''))
      .catch(() => setCrawlerPath(''));
  }, [activeTab, crawlerTabPlatform]);

  const handleCrawlerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCrawlerUploading(true);
    setCrawlerUploadMsg('');
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('platform', crawlerTabPlatform);
    form.append('file', file);
    fetch('/api/mediacrawler/upload-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })
      .then(r => r.json())
      .then(d => {
        setCrawlerUploadMsg(d.message || '');
        if (d.message && !d.message.includes('失败')) {
          setCrawlerLoginStatus(prev => ({ ...prev, status: 'has_session', message: d.message }));
        }
      })
      .catch(err => setCrawlerUploadMsg('上传失败: ' + err.message))
      .finally(() => { setCrawlerUploading(false); e.target.value = ''; });
  };

  const startLoginQr = async (forceNew = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setQrStarting(true);
    setQrcodeData(null);
    setQrLoginSuccess(false);
    setQrPollCount(0);
    try {
      const res = await fetch('/api/mediacrawler/start-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platform: crawlerTabPlatform, force_new: forceNew })
      });
      const data = await res.json().catch(() => ({}));
      if (!data.started) {
        setCrawlerUploadMsg(data.message || '启动失败');
        setQrStarting(false);
      } else if (forceNew) {
        setCrawlerLoginStatus(prev => (prev ? { ...prev, status: 'no_session', message: '已清除登录态，请扫码' } : prev));
      }
    } catch (e) {
      setCrawlerUploadMsg('启动失败: ' + e.message);
      setQrStarting(false);
    }
  };

  const qrPollRef = useRef(null);
  const statusPollRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'crawler' || !qrStarting) return;
    const token = localStorage.getItem('token');
    const clear = () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      qrPollRef.current = null;
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    };
    qrPollRef.current = setInterval(() => {
      setQrPollCount(c => c + 1);
      fetch(`/api/mediacrawler/login-qr?platform=${crawlerTabPlatform}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : {})
        .then(d => {
          if (d.qrcode) {
            setQrcodeData(d.qrcode);
            setQrPollCount(0);
            clear();
          }
        })
        .catch(() => {});
    }, 1000);
    return () => clear();
  }, [activeTab, crawlerTabPlatform, qrStarting]);

  // 离开「平台登录」标签时停止轮询并重置状态，避免后台持续请求
  useEffect(() => {
    if (activeTab !== 'crawler') {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      qrPollRef.current = null;
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      statusPollRef.current = null;
      setQrStarting(false);
      setStatusPollingActive(false);
      setStatusPollLongWait(false);
    }
  }, [activeTab]);

  // 二维码出现后，延迟约 2 秒再开始轮询登录状态，避免「还没扫码就在检测」的错觉；仅在此之后才轮询
  const [statusPollingActive, setStatusPollingActive] = useState(false);
  useEffect(() => {
    if (!qrcodeData) {
      setStatusPollingActive(false);
      return;
    }
    const t = setTimeout(() => setStatusPollingActive(true), 2000);
    return () => clearTimeout(t);
  }, [qrcodeData]);

  // 未拿到二维码时（例如只扫了弹窗 Chrome 里的码）也轮询登录状态，以便扫码后能检测到并收起「检测登录状态」
  useEffect(() => {
    if (activeTab !== 'crawler' || !qrStarting || qrcodeData) return;
    const token = localStorage.getItem('token');
    const id = setInterval(() => {
      fetch(`/api/mediacrawler/login-status?platform=${crawlerTabPlatform}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : {})
        .then(d => {
          if (d.status === 'has_session') {
            if (qrPollRef.current) clearInterval(qrPollRef.current);
            qrPollRef.current = null;
            setQrcodeData(null);
            setQrLoginSuccess(true);
            setCrawlerLoginStatus(d);
            setQrStarting(false);
          }
        })
        .catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, [activeTab, crawlerTabPlatform, qrStarting, qrcodeData]);

  // 轮询超过约 2 分钟后降频并提示，避免长时间高频请求
  const [statusPollLongWait, setStatusPollLongWait] = useState(false);

  useEffect(() => {
    if (!qrcodeData || !statusPollingActive || activeTab !== 'crawler') return;
    setStatusPollLongWait(false);
    const token = localStorage.getItem('token');
    const startTime = Date.now();
    let slowed = false;
    const poll = () => {
      fetch(`/api/mediacrawler/login-status?platform=${crawlerTabPlatform}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : {})
        .then(d => {
          if (d.status === 'has_session') {
            if (statusPollRef.current) clearInterval(statusPollRef.current);
            statusPollRef.current = null;
            setQrcodeData(null);
            setQrLoginSuccess(true);
            setCrawlerLoginStatus(d);
            setQrStarting(false);
            setStatusPollLongWait(false);
          }
        })
        .catch(() => {});
    };
    poll();
    statusPollRef.current = setInterval(() => {
      if (!slowed && Date.now() - startTime >= 120000) {
        slowed = true;
        if (statusPollRef.current) clearInterval(statusPollRef.current);
        setStatusPollLongWait(true);
        statusPollRef.current = setInterval(poll, 5000);
        return;
      }
      if (!slowed) poll();
    }, 800);
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    };
  }, [qrcodeData, statusPollingActive, crawlerTabPlatform, activeTab]);

  // 加载用户设置：优先从服务器 profile 拉取，失败或未登录时从 userSettings 本地存储拉取；仅更新 Context，不覆盖外观
  useEffect(() => {
    const applySettings = (settings) => {
      if (!settings) return;
      const updates = {};
      if (settings.language != null) updates.language = settings.language;
      if (settings.date_format != null) updates.dateFormat = settings.date_format;
      if (settings.dateFormat != null) updates.dateFormat = settings.dateFormat;
      if (settings.time_format != null) updates.timeFormat = settings.time_format;
      if (settings.timeFormat != null) updates.timeFormat = settings.timeFormat;
      if (settings.auto_refresh !== undefined) updates.autoRefresh = settings.auto_refresh;
      if (settings.autoRefresh !== undefined) updates.autoRefresh = settings.autoRefresh;
      if (settings.refresh_interval != null) updates.refreshInterval = settings.refresh_interval;
      if (settings.refreshInterval != null) updates.refreshInterval = settings.refreshInterval;
      if (settings.data_retention != null) updates.dataRetention = settings.data_retention;
      if (settings.dataRetention != null) updates.dataRetention = settings.dataRetention;
      if (Object.keys(updates).length) updateGlobalSettings(updates);
      setNotifications(settings.notifications || { email: true, push: true, sms: false });
      if (settings.alert_threshold != null) setAlertThreshold(settings.alert_threshold);
      if (settings.alertThreshold != null) setAlertThreshold(settings.alertThreshold);
      if (settings.two_factor !== undefined) setTwoFactor(settings.two_factor);
      if (settings.twoFactor !== undefined) setTwoFactor(settings.twoFactor);
      if (settings.two_factor_enabled !== undefined) setTwoFactor(settings.two_factor_enabled);
      if (settings.backup_enabled !== undefined) setBackupEnabled(settings.backup_enabled);
      if (settings.backupEnabled !== undefined) setBackupEnabled(settings.backupEnabled);
      if (settings.backup_frequency != null) setBackupFrequency(settings.backup_frequency || 'weekly');
      if (settings.backupFrequency != null) setBackupFrequency(settings.backupFrequency || 'weekly');
    };

    const token = localStorage.getItem('token');
    if (token && user) {
      fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to fetch profile')))
        .then(applySettings)
        .catch(() => {
          const saved = localStorage.getItem('userSettings');
          if (saved) applySettings(JSON.parse(saved));
        });
    } else {
      const saved = localStorage.getItem('userSettings');
      if (saved) applySettings(JSON.parse(saved));
    }
  }, [user, updateGlobalSettings]);

  const refetchSecuritySettings = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data.two_factor_enabled !== undefined) setTwoFactor(!!data.two_factor_enabled);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (activeTab !== 'security') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/backup/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : {})
      .then(d => setLastBackupTime(d.last_backup || null))
      .catch(() => setLastBackupTime(null));
  }, [activeTab]);

  const start2FASetup = () => {
    setTwoFactorSetupCode('');
    setTwoFactorSetupData(null);
    setTwoFactorSetupOpen(true);
    setTwoFactorSetupLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/auth/2fa/setup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.secret) setTwoFactorSetupData({ qr_image: data.qr_image, secret: data.secret });
        else setMessage(data.message || '获取失败');
      })
      .catch(() => setMessage('网络错误'))
      .finally(() => setTwoFactorSetupLoading(false));
  };

  const confirm2FASetup = (e) => {
    e.preventDefault();
    if (!twoFactorSetupCode || twoFactorSetupCode.length !== 6) { setMessage('请输入 6 位验证码'); return; }
    setTwoFactorSetupLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: twoFactorSetupCode }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.message.includes('错误') && !data.message.includes('过期')) {
          setMessage('两步验证已启用');
          setTwoFactorSetupOpen(false);
          setTwoFactorSetupData(null);
          setTwoFactorSetupCode('');
          refetchSecuritySettings();
        } else setMessage(data.message || '验证失败');
      })
      .catch(() => setMessage('网络错误'))
      .finally(() => setTwoFactorSetupLoading(false));
  };

  const confirm2FADisable = (e) => {
    e.preventDefault();
    if (!twoFactorDisableCode || twoFactorDisableCode.length !== 6) { setMessage('请输入 6 位验证码'); return; }
    if (twoFactorDisableConfirm !== '关闭') { setMessage('请输入「关闭」以确认'); return; }
    setTwoFactorDisableLoading(true);
    const token = localStorage.getItem('token');
    fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: twoFactorDisableCode }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.message.includes('错误') && !data.message.includes('过期')) {
          setMessage('两步验证已关闭');
          setTwoFactorDisableOpen(false);
          setTwoFactorDisableCode('');
          setTwoFactorDisableConfirm('');
          refetchSecuritySettings();
        } else setMessage(data.message || '验证失败');
      })
      .catch(() => setMessage('网络错误'))
      .finally(() => setTwoFactorDisableLoading(false));
  };

  // 保存设置
  const saveSettings = async () => {
    const token = localStorage.getItem('token');
    const settings = {
      language,
      dark_mode: darkMode,
      notifications,
      alert_threshold: alertThreshold,
      theme_color: themeColor,
      interface_density: interfaceDensity,
      font_size: fontSize,
      auto_refresh: autoRefresh,
      refresh_interval: refreshInterval,
      date_format: dateFormat,
      time_format: timeFormat,
      data_retention: dataRetention,
      two_factor: twoFactor,
      backup_enabled: backupEnabled,
      backup_frequency: backupFrequency
    };

    try {
      if (token && user) {
        // 保存到服务器 - 使用现有的用户资料端点
        const response = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            username: (settings.username !== undefined ? settings.username : user?.username) ?? '',
            email: (settings.email !== undefined ? settings.email : user?.email) ?? '',
            alert_threshold: settings.alert_threshold,
            backup_enabled: settings.backup_enabled,
            backup_frequency: settings.backup_frequency
          })
        });

        if (response.ok) {
          setMessage('设置已保存到服务器！');
          setTimeout(() => setMessage(''), 3000);
        } else {
          throw new Error('保存到服务器失败');
        }
      }
      
      // 同时保存到本地存储
      localStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('保存设置失败:', error);
      // 即使服务器保存失败，也要保存到本地存储
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setMessage('设置已保存到本地，服务器保存失败: ' + error.message);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // 重置为默认设置
  const resetToDefaults = () => {
    setLanguage('zh-CN');
    setDarkMode(false);
    setNotifications({
      email: true,
      push: true,
      sms: false
    });
    setAlertThreshold('high');
    setThemeColor('purple');
    setInterfaceDensity('standard');
    setFontSize('normal');
    setAutoRefresh(true);
    setRefreshInterval(30);
    setDateFormat('yyyy-mm-dd');
    setTimeFormat('24h');
    setDataRetention(365);
    setDoNotDisturb(false);
    setNotificationStart('08:00');
    setNotificationEnd('22:00');
    setTwoFactor(false);
    setBackupEnabled(false);
    setBackupFrequency('weekly');
    setMessage('已恢复默认设置，语言/主题/密度等已立即生效');
    setTimeout(() => setMessage(''), 3000);
  };

  // 切换通知选项
  const toggleNotification = (type) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // 导出设置
  const exportSettings = () => {
    const settings = {
      language,
      dark_mode: darkMode,
      notifications,
      alert_threshold: alertThreshold,
      theme_color: themeColor,
      interface_density: interfaceDensity,
      font_size: fontSize,
      auto_refresh: autoRefresh,
      refresh_interval: refreshInterval,
      date_format: dateFormat,
      time_format: timeFormat,
      data_retention: dataRetention,
      two_factor: twoFactor,
      backup_enabled: backupEnabled,
      backup_frequency: backupFrequency
    };
    
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'riskguard_settings.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setMessage('设置已导出');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="space-y-8 text-gray-900 dark:text-gray-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">系统设置</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">配置您的系统偏好和个性化选项</p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('成功') || message.includes('已') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧导航 */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">设置选项</h2>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'general'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.573 1.066c-.94 1.543.826 3.31 2.37 2.37a1.724 1.724 0 002.572 1.065c.426 1.756.426 4.19 0 5.937a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  通用设置
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'appearance'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  外观设置
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'notifications'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  通知设置
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('data-refresh')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'data-refresh'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  数据刷新与报告格式
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('llm')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'llm'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI / LLM 配置
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('crawler')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'crawler'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  平台登录（媒体爬虫）
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'security'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  安全设置
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('alert-rules')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'alert-rules'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  预警规则
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('audit-log')}
                  className={`w-full text-left px-4 py-2 rounded-lg flex items-center ${
                    activeTab === 'audit-log'
                      ? 'theme-bg-light theme-link font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2v10" />
                  </svg>
                  操作日志
                </button>
              </li>
            </ul>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={resetToDefaults}
                className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                恢复默认设置
              </button>
              <button
                onClick={exportSettings}
                className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center mt-2"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                导出设置
              </button>
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg flex items-center mt-2"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                API 文档（OpenAPI）
              </a>
            </div>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="lg:col-span-3">
          {activeTab === 'general' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">通用设置</h2>
              
              <div className="space-y-6">
                {/* 语言设置 - 选择后立即生效 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">界面语言</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] bg-white dark:bg-gray-700"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="zh-TW">繁体中文</option>
                    <option value="en-US">English</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">选择后立即更改界面语言（如页面标题等）</p>
                </div>

                {/* 日期格式 - 立即生效 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">日期格式</label>
                  <select 
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] bg-white dark:bg-gray-700"
                  >
                    <option value="yyyy-mm-dd">年-月-日 (2024-01-15)</option>
                    <option value="dd/mm/yyyy">日/月/年 (15/01/2024)</option>
                    <option value="mm/dd/yyyy">月/日/年 (01/15/2024)</option>
                    <option value="dd-mm-yyyy">日-月-年 (15-01-2024)</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">选择您偏好的日期显示格式</p>
                </div>

                {/* 时间格式 - 立即生效 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">时间格式</label>
                  <select 
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] bg-white dark:bg-gray-700"
                  >
                    <option value="24h">24小时制 (14:30)</option>
                    <option value="12h">12小时制 (2:30 PM)</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">选择您偏好的时间显示格式</p>
                </div>

                {/* 自动刷新 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">自动刷新数据</h3>
                    <p className="mt-1 text-sm text-gray-500">自动刷新监控数据和风险信息</p>
                  </div>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      autoRefresh ? 'theme-bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoRefresh ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 刷新间隔 */}
                {autoRefresh && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">刷新间隔（秒）</label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                      className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-2 theme-ring focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">数据自动刷新的时间间隔（10-300秒）</p>
                  </div>
                )}

                {/* 数据保留期限 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">数据保留期限（天）</label>
                  <input
                    type="number"
                    min="30"
                    max="730"
                    value={dataRetention}
                    onChange={(e) => setDataRetention(parseInt(e.target.value))}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-2 theme-ring focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">历史数据的保留期限（30-730天）</p>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={saveSettings}
                    className="theme-btn-primary px-6 py-2 rounded-lg transition-colors"
                  >
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">外观设置</h2>
              
              <div className="space-y-6">
                {/* 暗夜模式 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">暗夜模式</h3>
                    <p className="mt-1 text-sm text-gray-500">启用深色主题以减少眼部疲劳</p>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      darkMode ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        darkMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 主题配色：多套协调风格，切换后整站（含图表）统一生效 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">主题配色</label>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => setThemeColor(key)}
                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-colors ${
                          themeColor === key ? 'border-gray-800 dark:border-gray-200 ring-2 ring-offset-2 ring-primary' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        title={preset.name}
                      >
                        <span className="w-6 h-6 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: preset.primary }} />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">切换后整站主色、渐变与图表配色统一变更</p>
                </div>

                {/* 界面密度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">界面密度</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        interfaceDensity === 'comfortable' ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setInterfaceDensity('comfortable')}
                    >
                      <div className="font-medium">舒适</div>
                      <div className="text-sm text-gray-500">适合日常使用</div>
                    </div>
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        interfaceDensity === 'standard' ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setInterfaceDensity('standard')}
                    >
                      <div className="font-medium">标准</div>
                      <div className="text-sm text-gray-500">默认布局</div>
                    </div>
                    <div 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        interfaceDensity === 'compact' ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setInterfaceDensity('compact')}
                    >
                      <div className="font-medium">紧凑</div>
                      <div className="text-sm text-gray-500">显示更多内容</div>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">选择界面元素的间距密度</p>
                </div>

                {/* 字体大小 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">字体大小</label>
                  <div className="flex items-center space-x-4">
                    <button 
                      className={`px-4 py-2 border rounded-lg ${
                        fontSize === 'small' ? 'theme-border-selected theme-bg-light theme-link font-medium' : 'border-gray-300'
                      }`}
                      onClick={() => setFontSize('small')}
                    >
                      小
                    </button>
                    <button 
                      className={`px-4 py-2 border rounded-lg ${
                        fontSize === 'normal' ? 'theme-border-selected theme-bg-light theme-link font-medium' : 'border-gray-300'
                      }`}
                      onClick={() => setFontSize('normal')}
                    >
                      标准
                    </button>
                    <button 
                      className={`px-4 py-2 border rounded-lg ${
                        fontSize === 'large' ? 'theme-border-selected theme-bg-light theme-link font-medium' : 'border-gray-300'
                      }`}
                      onClick={() => setFontSize('large')}
                    >
                      大
                    </button>
                    <button 
                      className={`px-4 py-2 border rounded-lg ${
                        fontSize === 'extra-large' ? 'theme-border-selected theme-bg-light theme-link font-medium' : 'border-gray-300'
                      }`}
                      onClick={() => setFontSize('extra-large')}
                    >
                      超大
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">调整界面文字的大小</p>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={saveSettings}
                    className="theme-btn-primary px-6 py-2 rounded-lg transition-colors"
                  >
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">通知设置</h2>
              
              <div className="space-y-6">
                {/* 警报阈值 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">风险警报阈值</label>
                  <select 
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-2 theme-ring focus:border-transparent"
                  >
                    <option value="low">低风险 (20分以上)</option>
                    <option value="medium">中风险 (40分以上)</option>
                    <option value="high">高风险 (60分以上)</option>
                    <option value="critical">极高风险 (80分以上)</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">当企业风险评分超过设定阈值时触发警报</p>
                </div>

                {/* 通知方式 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">通知方式</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">邮件通知</p>
                        <p className="text-sm text-gray-500">通过电子邮件接收重要通知</p>
                      </div>
                      <button
                        onClick={() => toggleNotification('email')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          notifications.email ? 'theme-bg-primary' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.email ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">推送通知</p>
                        <p className="text-sm text-gray-500">在浏览器中接收实时通知</p>
                      </div>
                      <button
                        onClick={() => toggleNotification('push')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          notifications.push ? 'theme-bg-primary' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.push ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">短信通知</p>
                        <p className="text-sm text-gray-500">通过短信接收紧急通知</p>
                      </div>
                      <button
                        onClick={() => toggleNotification('sms')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          notifications.sms ? 'theme-bg-primary' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.sms ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 邮件通知（系统）— 提醒发送至个人中心邮箱 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮件通知（系统）</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">风险提醒等将发送至您在<strong>个人中心</strong>填写的邮箱。</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">当前接收邮箱：{emailStatus.user_email || '未设置'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">SMTP：{emailStatus.smtp_configured ? '已配置' : '未配置（需管理员设置环境变量）'}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setTestEmailSending(true);
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch('/api/notifications/test-email', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                          const data = await res.json().catch(() => ({}));
                          setMessage(res.ok ? (data.message || '已发送') : (data.message || '发送失败'));
                        } catch (e) {
                          setMessage('发送失败: ' + e.message);
                        }
                        setTimeout(() => setMessage(''), 4000);
                        setTestEmailSending(false);
                      }}
                      disabled={testEmailSending || !emailStatus.user_email}
                      className="px-4 py-2 rounded-lg theme-btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {testEmailSending ? '发送中...' : '发送测试邮件'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setTestEmailSending(true);
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch('/api/notifications/send-risk-digest', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                          const data = await res.json().catch(() => ({}));
                          setMessage(res.ok ? (data.message || '已发送') : (data.message || '发送失败'));
                        } catch (e) {
                          setMessage('发送失败: ' + e.message);
                        }
                        setTimeout(() => setMessage(''), 4000);
                        setTestEmailSending(false);
                      }}
                      disabled={testEmailSending || !emailStatus.user_email}
                      className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      发送风险速览邮件
                    </button>
                  </div>
                </div>

                {/* 通知时间段 - 立即生效并持久化 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">通知时间段</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">开始时间</label>
                      <input
                        type="time"
                        value={notificationStart}
                        onChange={(e) => setNotificationStart(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">结束时间</label>
                      <input
                        type="time"
                        value={notificationEnd}
                        onChange={(e) => setNotificationEnd(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">设置接收通知的时间范围，修改后立即生效</p>
                </div>

                {/* 免打扰模式 - 立即生效并持久化 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">免打扰模式</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">开启后暂停接收非紧急通知</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDoNotDisturb(!doNotDisturb)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      doNotDisturb ? 'bg-[var(--primary-color)]' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        doNotDisturb ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={saveSettings}
                    className="theme-btn-primary px-6 py-2 rounded-lg transition-colors"
                  >
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data-refresh' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">数据刷新与报告格式</h2>
              <div className="space-y-6 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">企业信息自动刷新间隔（分钟）</label>
                  <input
                    type="number"
                    min="10"
                    max="1440"
                    value={searchInterval}
                    onChange={(e) => setSearchInterval(Math.max(10, Math.min(1440, parseInt(e.target.value) || 30)))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring"
                  />
                  <p className="mt-1 text-sm text-gray-500">10-1440 分钟，默认 30 分钟更新一次企业信息</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自定义报告格式（可选）</label>
                  <textarea
                    value={reportTemplate}
                    onChange={(e) => setReportTemplate(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring"
                    placeholder="可用变量：{name} {industry} {risk_level} {legal_representative} {registered_capital} {social_evaluation} 等"
                  />
                  <p className="mt-1 text-sm text-gray-500">留空使用系统默认格式</p>
                </div>
                <button onClick={saveSearchInterval} className="theme-btn-primary px-6 py-2 rounded-lg">
                  保存设置
                </button>
              </div>
            </div>
          )}

          {activeTab === 'llm' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6">AI / LLM API 配置</h2>
              <p className="text-gray-600 mb-6">配置您的大模型 API，用于分析媒体舆情、文档内容并归类到企业。支持 OpenAI、Azure、国内兼容接口。</p>
              <div className="space-y-6 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <input
                    type="password"
                    value={llmConfig.api_key}
                    onChange={(e) => setLlmConfig({ ...llmConfig, api_key: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring"
                    placeholder="sk-xxx 或您的 API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base URL（可选）</label>
                  <input
                    type="text"
                    value={llmConfig.base_url}
                    onChange={(e) => setLlmConfig({ ...llmConfig, base_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring"
                    placeholder="OpenAI: https://api.openai.com/v1；通义千问: https://dashscope.aliyuncs.com/compatible-mode/v1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">模型</label>
                  <input
                    type="text"
                    value={llmConfig.model}
                    onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 theme-ring"
                    placeholder="gpt-4o-mini 或 qwen-plus 等"
                  />
                </div>
                <div className="rounded-xl border-2 border-gray-200 dark:border-gray-600 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <span className="inline-flex w-8 h-8 rounded-lg theme-bg-light flex items-center justify-center theme-link text-xs">联网</span>
                        联网搜索（工商信息）
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">添加企业时使用大模型联网搜索法人、注册资本等工商信息。通义千问建议使用 qwen3-max（qwen-plus 可能不支持联网）。</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={llmConfig.enable_web_search}
                      onClick={() => setLlmConfig({ ...llmConfig, enable_web_search: !llmConfig.enable_web_search })}
                      className={`relative flex-shrink-0 inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 theme-ring focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        llmConfig.enable_web_search ? 'theme-bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className="sr-only">联网搜索开关</span>
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                          llmConfig.enable_web_search ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={saveLlmConfig} className="theme-btn-primary px-6 py-2 rounded-lg">
                    保存 LLM 配置
                  </button>
                  <button onClick={testLlmCompany} disabled={testing} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50">
                    {testing ? '测试中...' : '测试工商信息搜集（美团）'}
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-4 p-4 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                    {testResult.ok ? (
                      <>
                        <p className="font-medium">✓ 测试成功</p>
                        <p className="mt-2 opacity-90">返回字段：{Object.keys(testResult.data?.result || {}).join(', ')}</p>
                        {testResult.data?.result?.legal_representative && (
                          <p className="mt-1">法定代表人：{testResult.data.result.legal_representative}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium">✗ 测试失败</p>
                        <p className="mt-2">{testResult.data?.error || testResult.data?.hint || '未知错误'}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'crawler' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">平台登录（媒体爬虫）</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">在此页选择平台后点击「生成二维码」进行扫码登录；登录成功后可直接在服务器上爬取。若二维码方式不可用，也可在本机扫码后上传 Cookie/Session 文件。</p>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">MediaCrawler 项目路径</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">指向克隆的 MediaCrawler 项目根目录（含 main.py）。.app 下在此保存后会自动写入应用数据目录，重启后仍生效。</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={crawlerPath}
                      onChange={(e) => { setCrawlerPath(e.target.value); setCrawlerPathMsg(''); }}
                      placeholder="/path/to/MediaCrawler 或 留空使用环境变量"
                      className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                      type="button"
                      disabled={crawlerPathSaving}
                      onClick={async () => {
                        setCrawlerPathSaving(true); setCrawlerPathMsg('');
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch('/api/mediacrawler/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ path: crawlerPath })
                          });
                          const data = await res.json().catch(() => ({}));
                          setCrawlerPathMsg(data.message || (data.ok ? '已保存' : data.message || '保存失败'));
                        } catch (e) {
                          setCrawlerPathMsg('保存失败: ' + e.message);
                        } finally {
                          setCrawlerPathSaving(false);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[var(--primary-color)] text-white hover:opacity-90 disabled:opacity-50 text-sm"
                    >
                      {crawlerPathSaving ? '保存中…' : '保存路径'}
                    </button>
                  </div>
                  {crawlerPathMsg && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{crawlerPathMsg}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">选择平台</label>
                  <select
                    value={crawlerTabPlatform}
                    onChange={(e) => { setCrawlerTabPlatform(e.target.value); setQrcodeData(null); setQrLoginSuccess(false); }}
                    className="w-full md:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="xhs">小红书</option>
                    <option value="wb">微博</option>
                    <option value="zhihu">知乎</option>
                    <option value="bili">B站</option>
                    <option value="dy">抖音</option>
                  </select>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">扫码登录</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">点击「生成二维码」后，使用对应平台 App 扫描下方二维码；登录成功后此处会显示成功提示。若已登录但二维码不出现，可点「强制重新登录」再生成二维码。</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={qrStarting && !qrcodeData}
                      onClick={() => startLoginQr(false)}
                      className="px-4 py-2 rounded-lg bg-[var(--primary-color)] text-white hover:opacity-90 disabled:opacity-50 text-sm"
                    >
                      {qrStarting && !qrcodeData ? '正在生成…' : '生成二维码'}
                    </button>
                    {crawlerLoginStatus?.status === 'has_session' && (
                      <button
                        type="button"
                        disabled={qrStarting}
                        onClick={() => startLoginQr(true)}
                        className="px-4 py-2 rounded-lg border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 text-sm"
                      >
                        强制重新登录
                      </button>
                    )}
                  </div>
                  {qrStarting && !qrcodeData && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">正在获取二维码，请稍候…</p>
                  )}
                  {qrStarting && !qrcodeData && qrPollCount >= 30 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">若超过 30 秒仍未出现，请查看后端终端日志或 data/mediacrawler_qr 目录是否生成文件，并确认 MEDIACRAWLER_PATH 与虚拟环境正确。</p>
                  )}
                  {qrcodeData && (
                    <div className="mt-4 flex flex-col items-start gap-2">
                      <img src={qrcodeData} alt="登录二维码" className="w-44 h-44 border border-gray-300 dark:border-gray-600 rounded-lg bg-white" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">请使用 {crawlerTabPlatform === 'xhs' ? '小红书' : crawlerTabPlatform === 'wb' ? '微博' : crawlerTabPlatform === 'zhihu' ? '知乎' : crawlerTabPlatform === 'bili' ? 'B站' : '抖音'} App 扫码</p>
                      {!statusPollingActive ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">扫码成功后约 2 秒内将自动显示「登录成功」</p>
                      ) : statusPollLongWait ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400">若已用小红书扫码完成，请再等 1～2 分钟（脚本在验证并执行简短爬取），或稍后刷新本页查看；检测已改为每 5 秒一次</p>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">正在检测登录状态…</p>
                      )}
                    </div>
                  )}
                  {qrLoginSuccess && (
                    <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm">✓ 扫码登录成功，当前平台已具备登录态</div>
                  )}
                </div>
                {crawlerLoginStatus && (
                  <div className={`p-3 rounded-lg text-sm ${crawlerLoginStatus.status === 'has_session' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'}`}>
                    {crawlerLoginStatus.status === 'has_session' ? '✓ ' : ''}{crawlerLoginStatus.message}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">上传 Cookie / Session 文件</label>
                  <label className="inline-flex items-center px-4 py-2 theme-btn-primary rounded-lg text-sm cursor-pointer disabled:opacity-50">
                    <input type="file" accept=".json,.txt" onChange={handleCrawlerUpload} disabled={crawlerUploading} className="hidden" />
                    {crawlerUploading ? '上传中...' : '选择文件上传'}
                  </label>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">在本机运行 MediaCrawler 扫码登录后，从其数据目录复制对应平台的 cookie/session 文件上传</p>
                  {crawlerUploadMsg && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{crawlerUploadMsg}</p>}
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">测试爬取</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">使用当前平台按下方关键词执行一次简短爬取，返回少量数据以验证配置。结果内容即该关键词在平台上的搜索结果。</p>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">关键词：</label>
                    <input
                      type="text"
                      value={crawlerTestKeyword}
                      onChange={(e) => setCrawlerTestKeyword(e.target.value)}
                      placeholder="如：美团、编程"
                      className="w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                      type="button"
                      disabled={crawlerTesting}
                      onClick={async () => {
                        const kw = (crawlerTestKeyword || '美团').trim() || '美团';
                        setCrawlerTesting(true);
                        setCrawlerTestResult(null);
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch('/api/mediacrawler/test-crawl', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ keyword: kw, platform: crawlerTabPlatform })
                          });
                          const data = await res.json().catch(() => ({}));
                          setCrawlerTestResult({ ...data, keyword: data.keyword || kw });
                        } catch (e) {
                          setCrawlerTestResult({ ok: false, message: e.message, sample: [], keyword: kw });
                        } finally {
                          setCrawlerTesting(false);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[var(--primary-color)] text-white hover:opacity-90 disabled:opacity-50 text-sm"
                    >
                      {crawlerTesting ? '测试中...' : '测试爬取'}
                    </button>
                  </div>
                  {crawlerTestResult && (
                    <div className={`mt-4 p-4 rounded-lg text-sm ${crawlerTestResult.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'}`}>
                      <p className="font-medium">{crawlerTestResult.ok ? '✓ 爬取成功' : '爬取未返回数据或未配置'}</p>
                      <p className="mt-1 opacity-90">关键词：{crawlerTestResult.keyword || '美团'} · {crawlerTestResult.message}</p>
                      {crawlerTestResult.count != null && <p className="mt-1">共 {crawlerTestResult.count} 条</p>}
                      {crawlerTestResult.sample?.length > 0 && (
                        <ul className="mt-2 space-y-1 list-disc list-inside">
                          {crawlerTestResult.sample.slice(0, 3).map((r, i) => (
                            <li key={i}>{r.title || r.content?.slice(0, 50)}</li>
                          ))}
                        </ul>
                      )}
                      {crawlerTestResult.crawl_stderr && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs opacity-80">查看爬虫调试输出</summary>
                          <pre className="mt-2 p-2 rounded bg-black/10 dark:bg-white/10 text-xs overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">{crawlerTestResult.crawl_stderr}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">安全设置</h2>
              
              <div className="space-y-6">
                {/* 两步验证 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">两步验证</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">使用 Authenticator 应用增强账户安全</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {twoFactor ? (
                      <>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">已启用</span>
                        <button
                          type="button"
                          onClick={() => { setTwoFactorDisableCode(''); setTwoFactorDisableConfirm(''); setTwoFactorDisableOpen(true); }}
                          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          关闭两步验证
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={start2FASetup}
                        className="theme-btn-primary px-4 py-2 rounded-lg text-sm"
                      >
                        启用两步验证
                      </button>
                    )}
                  </div>
                </div>

                {/* 自动备份 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">自动备份</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">系统将定期备份数据库</p>
                  </div>
                  <button
                    onClick={() => setBackupEnabled(!backupEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                      backupEnabled ? 'theme-bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        backupEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {backupEnabled && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">备份频率</label>
                    <select 
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value)}
                      className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 theme-ring"
                    >
                      <option value="daily">每天</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                    {lastBackupTime && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">上次备份：{lastBackupTime}</p>
                    )}
                  </div>
                )}

                {/* 两步验证 - 启用弹窗 */}
                {twoFactorSetupOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !twoFactorSetupLoading && setTwoFactorSetupOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">启用两步验证</h3>
                      {twoFactorSetupLoading && !twoFactorSetupData && <p className="text-gray-500">加载中...</p>}
                      {twoFactorSetupData && (
                        <>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">使用 Authenticator（如 Google Authenticator）扫描下方二维码，然后输入 6 位验证码。</p>
                          <div className="flex justify-center mb-4">
                            <img src={twoFactorSetupData.qr_image} alt="2FA QR" className="w-40 h-40 rounded-lg border border-gray-200 dark:border-gray-600" />
                          </div>
                          <form onSubmit={confirm2FASetup} className="space-y-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={twoFactorSetupCode}
                              onChange={e => setTwoFactorSetupCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="输入 6 位验证码"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <div className="flex gap-2">
                              <button type="submit" disabled={twoFactorSetupLoading || twoFactorSetupCode.length !== 6} className="theme-btn-primary px-4 py-2 rounded-lg disabled:opacity-50">
                                {twoFactorSetupLoading ? '验证中...' : '确认启用'}
                              </button>
                              <button type="button" onClick={() => setTwoFactorSetupOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                                取消
                              </button>
                            </div>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 两步验证 - 关闭弹窗 */}
                {twoFactorDisableOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !twoFactorDisableLoading && setTwoFactorDisableOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">关闭两步验证</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">请输入当前 6 位验证码，并输入「关闭」以确认。</p>
                      <form onSubmit={confirm2FADisable} className="space-y-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={twoFactorDisableCode}
                          onChange={e => setTwoFactorDisableCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="输入 6 位验证码"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <input
                          type="text"
                          value={twoFactorDisableConfirm}
                          onChange={e => setTwoFactorDisableConfirm(e.target.value)}
                          placeholder="输入「关闭」以确认"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={twoFactorDisableLoading || twoFactorDisableCode.length !== 6 || twoFactorDisableConfirm !== '关闭'} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                            {twoFactorDisableLoading ? '处理中...' : '确认关闭'}
                          </button>
                          <button type="button" onClick={() => setTwoFactorDisableOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                            取消
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* 修改密码：跳转至个人中心 */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">修改密码</h3>
                  <p className="text-gray-600 text-sm mb-3">修改密码请前往个人中心操作</p>
                  <button
                    onClick={() => navigate('/personal-center')}
                    className="theme-link font-medium flex items-center"
                  >
                    前往个人中心
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* 安全提示 */}
                <div className="p-4 bg-blue-50 rounded-lg mt-6">
                  <h4 className="font-medium text-blue-800 mb-2">安全提示</h4>
                  <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                    <li>定期更换密码以确保账户安全</li>
                    <li>启用两步验证可以大幅提升账户安全性</li>
                    <li>不要在公共设备上保存登录凭据</li>
                    <li>如发现异常活动，请立即更改密码</li>
                  </ul>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={saveSettings}
                    className="theme-btn-primary px-6 py-2 rounded-lg transition-colors"
                  >
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alert-rules' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">预警规则</h2>
              <AlertRulesSection />
            </div>
          )}

          {activeTab === 'audit-log' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">操作日志</h2>
              <AuditLogSection isAdmin={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;