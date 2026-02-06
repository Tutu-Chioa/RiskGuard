/**
 * 界面语言：根据设置中的 language 返回对应文案。
 * 使用 useTranslation() 获取 t(key) 与 language；未匹配 key 时返回 key 本身。
 */
import { useSettings } from './SettingsContext';

const messages = {
  'zh-CN': {
    // 侧边栏
    'nav.home': '首页概览',
    'nav.company': '企业管理',
    'nav.alerts': '风险警报',
    'nav.compare': '企业对比',
    'nav.tasks': '任务状态',
    'nav.upload': '上传资料',
    'nav.analytics': '数据分析',
    'nav.settings': '系统设置',
    'nav.admin': '管理后台',
    'nav.status': '系统状态',
    'nav.logout': '退出登录',
    // 通用
    'common.loading': '加载中...',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.search': '搜索',
    'common.searchPlaceholder': '搜索企业或资讯...',
    'common.noResults': '未找到相关结果',
    'common.personalCenter': '个人中心',
    'common.company': '企业',
    'common.news': '资讯',
    // 首页 / 面板
    'home.overview': '首页概览',
    'home.riskAlerts': '风险警报',
    'home.recentCompanies': '最近更新企业',
    'home.viewDetail': '查看详情',
    'home.quickAdd': '添加企业',
    'home.dataAnalytics': '数据分析',
    'panel.latestNews': '最新企业资讯',
    'panel.viewAll': '查看全部',
    'panel.policy': '最新政策与市场环境',
    'panel.policyUpdate': '立即更新',
    'panel.updating': '更新中…',
    'panel.riskOverview': '风险速览',
    'panel.monitored': '监控企业',
    'panel.todayNews': '今日资讯',
    'panel.highRisk': '高风险',
    'panel.noPolicy': '暂无政策摘要',
    'panel.noPolicyHint': '每 6 小时自动更新，请配置 LLM 联网搜索后等待更新',
    'panel.noNews': '暂无企业资讯',
    'news.detail': '资讯详情',
    'news.summary': '资讯摘要',
    'news.viewCompany': '查看企业详情',
    'news.viewSource': '查看原文',
    'news.backSummary': '返回摘要',
    'news.viewDetail': '查看资讯详情',
    'policy.title': '政策与市场环境',
    'policy.updatedAt': '更新于',
    'alerts.title': '风险警报',
    'alerts.noAlerts': '暂无风险警报',
    'alerts.handle': '处理警报',
    'alerts.viewDetail': '查看详情',
    'alerts.relativeTime': '分钟前',
    'alerts.hoursAgo': '小时前',
  },
  'en-US': {
    'nav.home': 'Home',
    'nav.company': 'Companies',
    'nav.alerts': 'Risk Alerts',
    'nav.compare': 'Compare',
    'nav.tasks': 'Task Status',
    'nav.upload': 'Upload',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.status': 'System Status',
    'nav.logout': 'Logout',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.searchPlaceholder': 'Search companies or news...',
    'common.noResults': 'No results found',
    'common.personalCenter': 'Profile',
    'common.company': 'Company',
    'common.news': 'News',
    'home.overview': 'Overview',
    'home.riskAlerts': 'Risk Alerts',
    'home.recentCompanies': 'Recently Updated',
    'home.viewDetail': 'View detail',
    'home.quickAdd': 'Add Company',
    'home.dataAnalytics': 'Analytics',
    'panel.latestNews': 'Latest News',
    'panel.viewAll': 'View all',
    'panel.policy': 'Policy & Market',
    'panel.policyUpdate': 'Update now',
    'panel.updating': 'Updating…',
    'panel.riskOverview': 'Risk Overview',
    'panel.monitored': 'Monitored',
    'panel.todayNews': 'Today',
    'panel.highRisk': 'High Risk',
    'panel.noPolicy': 'No policy digest',
    'panel.noPolicyHint': 'Auto-update at 6:00 or click Update now',
    'panel.noNews': 'No news',
    'news.detail': 'News detail',
    'news.summary': 'Summary',
    'news.viewCompany': 'View company',
    'news.viewSource': 'View source',
    'news.backSummary': 'Back to summary',
    'news.viewDetail': 'View detail',
    'policy.title': 'Policy & Market',
    'policy.updatedAt': 'Updated',
    'alerts.title': 'Risk Alerts',
    'alerts.noAlerts': 'No alerts',
    'alerts.handle': 'Handle',
    'alerts.viewDetail': 'View detail',
    'alerts.relativeTime': 'min ago',
    'alerts.hoursAgo': 'h ago',
  }
};

function getLang(language) {
  if (messages[language]) return messages[language];
  if (language && language.startsWith('en')) return messages['en-US'];
  return messages['zh-CN'];
}

/**
 * 获取当前语言的 t 函数（用于非组件或无法用 hook 时，需传入 language）
 */
export function getT(language) {
  const dict = getLang(language || 'zh-CN');
  return (key) => dict[key] ?? key;
}

/**
 * 在组件内使用：从 SettingsContext 读取 language，返回 t(key) 与 language
 */
export function useTranslation() {
  const { settings } = useSettings();
  const lang = settings.language || 'zh-CN';
  const dict = getLang(lang);
  return {
    t: (key) => dict[key] ?? key,
    language: lang
  };
}

export { messages };
