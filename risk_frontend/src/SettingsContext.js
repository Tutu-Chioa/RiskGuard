import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTheme } from './themePresets';

const STORAGE_KEY = 'risk_platform_settings';

const defaultSettings = {
  darkMode: false,
  themeColor: 'purple',
  fontSize: 'normal',
  interfaceDensity: 'standard',
  language: 'zh-CN',
  dateFormat: 'yyyy-mm-dd',
  timeFormat: '24h',
  autoRefresh: true,
  refreshInterval: 30,
  dataRetention: 365,
  doNotDisturb: false,
  notificationStart: '08:00',
  notificationEnd: '22:00',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // 应用设置到 DOM：多主题配色（主色、渐变、图表色板等）+ 语言/深色/字体/密度
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', (settings.language || 'zh-CN').split('-')[0]);
    if (settings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const theme = getTheme(settings.themeColor);
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-primary-hover', theme.primaryHover);
    root.style.setProperty('--theme-primary-light', theme.primaryLight);
    root.style.setProperty('--theme-gradient-from', theme.gradientFrom);
    root.style.setProperty('--theme-gradient-to', theme.gradientTo);
    root.style.setProperty('--theme-gradient-muted', theme.gradientMuted);
    root.style.setProperty('--theme-ring', theme.ringColor);
    theme.chartColors.forEach((c, i) => root.style.setProperty(`--theme-chart-${i + 1}`, c));
    root.style.setProperty('--theme-line-stroke', theme.lineChartStroke);
    root.style.fontSize = settings.fontSize === 'small' ? '14px' :
      settings.fontSize === 'large' ? '16px' :
      settings.fontSize === 'extra-large' ? '18px' : '15px';
    root.style.setProperty('--density-spacing',
      settings.interfaceDensity === 'compact' ? '0.5rem' :
      settings.interfaceDensity === 'comfortable' ? '1.5rem' : '1rem');
  }, [settings.darkMode, settings.themeColor, settings.fontSize, settings.interfaceDensity, settings.language]);

  const updateSettings = (updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  return ctx || { settings: defaultSettings, updateSettings: () => {} };
}
