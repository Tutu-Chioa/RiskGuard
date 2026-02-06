/**
 * 从 SettingsContext 读取 dateFormat、timeFormat、language，提供 formatDate / formatDateTime / formatTime。
 */
import { useSettings } from '../SettingsContext';
import { formatDate as fmtDate, formatDateTime as fmtDateTime, formatTime as fmtTime } from './dateTimeFormat';

export function useDateTimeFormat() {
  const { settings } = useSettings();
  const dateFormat = settings.dateFormat || 'yyyy-mm-dd';
  const timeFormat = settings.timeFormat || '24h';
  const lang = settings.language || 'zh-CN';
  const locale = lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : (lang.split('-').length >= 2 ? lang : 'zh-CN');

  const opts = { dateFormat, timeFormat, locale };

  return {
    formatDate: (value) => fmtDate(value, { ...opts }),
    formatDateTime: (value) => fmtDateTime(value, { ...opts }),
    formatTime: (value, showSeconds = false) => fmtTime(value, { ...opts, showSeconds }),
    dateFormat,
    timeFormat,
    locale
  };
}
