/**
 * 多主题配色预设：整套风格（主色、渐变、图表色板等），设置中切换后全局生效
 */
export const THEME_PRESETS = {
  purple: {
    name: '紫色经典',
    primary: '#7c3aed',
    primaryHover: '#6d28d9',
    primaryLight: '#a78bfa',
    gradientFrom: '#7c3aed',
    gradientTo: '#4f46e5',
    gradientMuted: '#c4b5fd',
    chartColors: ['#8b5cf6', '#6366f1', '#a78bfa', '#818cf8', '#c4b5fd', '#a5b4fc', '#ddd6fe', '#e9d5ff'],
    lineChartStroke: '#8b5cf6',
    ringColor: '#7c3aed',
  },
  blue: {
    name: '蓝色商务',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#60a5fa',
    gradientFrom: '#2563eb',
    gradientTo: '#0ea5e9',
    gradientMuted: '#93c5fd',
    chartColors: ['#3b82f6', '#0ea5e9', '#06b6d4', '#38bdf8', '#7dd3fc', '#22d3ee', '#67e8f9', '#a5f3fc'],
    lineChartStroke: '#2563eb',
    ringColor: '#2563eb',
  },
  teal: {
    name: '青绿清新',
    primary: '#0d9488',
    primaryHover: '#0f766e',
    primaryLight: '#2dd4bf',
    gradientFrom: '#0d9488',
    gradientTo: '#0891b2',
    gradientMuted: '#5eead4',
    chartColors: ['#14b8a6', '#06b6d4', '#22d3ee', '#2dd4bf', '#5eead4', '#67e8f9', '#99f6e4', '#ccfbf1'],
    lineChartStroke: '#0d9488',
    ringColor: '#0d9488',
  },
  warm: {
    name: '暖色橙金',
    primary: '#ea580c',
    primaryHover: '#c2410c',
    primaryLight: '#fb923c',
    gradientFrom: '#ea580c',
    gradientTo: '#ca8a04',
    gradientMuted: '#fdba74',
    chartColors: ['#f97316', '#eab308', '#fbbf24', '#fb923c', '#fcd34d', '#fde047', '#fde68a', '#fef3c7'],
    lineChartStroke: '#ea580c',
    ringColor: '#ea580c',
  },
  slate: {
    name: '深色灰蓝',
    primary: '#475569',
    primaryHover: '#334155',
    primaryLight: '#64748b',
    gradientFrom: '#475569',
    gradientTo: '#1e293b',
    gradientMuted: '#94a3b8',
    chartColors: ['#64748b', '#475569', '#94a3b8', '#64748b', '#cbd5e1', '#e2e8f0', '#94a3b8', '#475569'],
    lineChartStroke: '#64748b',
    ringColor: '#475569',
  },
  pink: {
    name: '粉紫',
    primary: '#db2777',
    primaryHover: '#be185d',
    primaryLight: '#f472b6',
    gradientFrom: '#db2777',
    gradientTo: '#7c3aed',
    gradientMuted: '#f9a8d4',
    chartColors: ['#ec4899', '#db2777', '#f472b6', '#a78bfa', '#c084fc', '#f9a8d4', '#e9d5ff', '#fce7f3'],
    lineChartStroke: '#db2777',
    ringColor: '#db2777',
  },
};

export const DEFAULT_THEME_KEY = 'purple';

export function getTheme(key) {
  return THEME_PRESETS[key] || THEME_PRESETS[DEFAULT_THEME_KEY];
}
