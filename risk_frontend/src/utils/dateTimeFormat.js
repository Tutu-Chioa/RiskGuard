/**
 * 根据系统设置中的日期格式、时间格式，将 Date 或 ISO 字符串格式化为显示字符串。
 * 供 useDateTimeFormat 使用，也可直接传入 dateFormat/timeFormat 使用。
 */

const DEFAULT_DATE = 'yyyy-mm-dd';
const DEFAULT_TIME = '24h';

/**
 * 将 dateFormat 预设转为 Intl 选项（仅日期）
 * @param {string} preset - 'yyyy-mm-dd' | 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy年mm月dd日'
 */
function getDateOptions(preset) {
  switch ((preset || DEFAULT_DATE).toLowerCase()) {
    case 'dd/mm/yyyy':
      return { day: '2-digit', month: '2-digit', year: 'numeric' };
    case 'mm/dd/yyyy':
      return { month: '2-digit', day: '2-digit', year: 'numeric' };
    case 'yyyy年mm月dd日':
      return { year: 'numeric', month: 'long', day: 'numeric' };
    case 'yyyy-mm-dd':
    default:
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
  }
}

/**
 * 将 timeFormat 预设转为 hour12
 * @param {string} preset - '24h' | '12h'
 */
function getHour12(preset) {
  return (preset || DEFAULT_TIME).toLowerCase() === '12h';
}

/**
 * 格式化仅日期（无时间）
 * @param {Date|string|null|undefined} value
 * @param {{ dateFormat?: string, locale?: string }} options
 * @returns {string}
 */
export function formatDate(value, options = {}) {
  if (value == null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = options.locale || 'zh-CN';
  const opts = getDateOptions(options.dateFormat || DEFAULT_DATE);
  return d.toLocaleDateString(locale, opts);
}

/**
 * 格式化日期+时间
 * @param {Date|string|null|undefined} value
 * @param {{ dateFormat?: string, timeFormat?: string, locale?: string }} options
 * @returns {string}
 */
export function formatDateTime(value, options = {}) {
  if (value == null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = options.locale || 'zh-CN';
  const dateOpts = getDateOptions(options.dateFormat || DEFAULT_DATE);
  const hour12 = getHour12(options.timeFormat || DEFAULT_TIME);
  return d.toLocaleString(locale, {
    ...dateOpts,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12
  });
}

/**
 * 仅格式化时间（时:分 或 时:分:秒）
 * @param {Date|string|null|undefined} value
 * @param {{ timeFormat?: string, locale?: string, showSeconds?: boolean }} options
 * @returns {string}
 */
export function formatTime(value, options = {}) {
  if (value == null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = options.locale || 'zh-CN';
  const hour12 = getHour12(options.timeFormat || DEFAULT_TIME);
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: options.showSeconds ? '2-digit' : undefined,
    hour12
  });
}
