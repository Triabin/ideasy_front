/** 数学工具类 */
export const MyMathUtils = {
  /**
   * 函数描述：获取指定区间的随机整数
   * @param min {number} 最小值
   * @param max {number} 最大值
   * @return { number } 符合条件的随机整数
   */
  randomInt: (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min,

  /**
   * 函数描述：在坐标系上计算从距离指定位置指定距离且指定角度点的坐标
   * @param distance {number} 指定距离
   * @param rad {number} 指定角度的弧度值
   * @param from { {x: number, y: number} } 起始坐标数组，from.x：横坐标、from.y：纵坐标
   * @return { {x: number, y: number} } 目标地点坐标，dest.x：横坐标、dest.y：纵坐标
   */
  computeCoordinates: (distance: number, rad: number, from: { x: number, y: number }): { x: number, y: number } => {
    from = from || {x: 0, y: 0};
    return {
      x: from.x + distance * Math.cos(rad),
      y: from.y + distance * Math.sin(rad)
    };
  }
};

/** 日期对象工具类 */
export const DateUtils = {
  /**
   * 函数描述：时间格式化工具
   * @param date {Date} 要格式化的日期对象
   * @param format {String} 格式（y-年，M-月，d-日，H-时[24]，h-时[12]，m-分，s-秒，S-毫秒(3位数)，q-季度，ap，午前am/午后pm）
   * @returns {String} 格式化后的字符串
   */
  format: (date: Date, format: string = 'yyyy-MM-dd HH:mm:ss'): string => {
    let o: { [key: string]: number | string } = {
      'M+': date.getMonth() + 1, // 月份
      'd+': date.getDate(), // 日
      'H+': date.getHours(), // 时（24小时制）
      'h+': date.getHours() % 12 === 0 ? 12 : date.getHours() % 12, // 时（12小时制）
      'm+': date.getMinutes(), // 分
      's+': date.getSeconds(), // 秒
      'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
      'S': date.getMilliseconds(), // 毫秒
      'ap': date.getHours() > 12 ? 'am' : 'pm'
    };
    let week = ['日', '一', '二', '三', '四', '五', '六'];
    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    if (/(E+)/.test(format)) {
      format = format.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? '星期' : '周') : '') + week[date.getDay()]);
    }
    for (let k in o) {
      let el = o[k];
      if (new RegExp('(' + k + ')').test(format)) {
        // 原代码中 el 类型为 string | number，而 replace 方法的第二个参数期望是一个函数或字符串，这里将 el 转换为字符串
        // 同时使用 match 方法替代已弃用的 RegExp.$1，使用 slice 方法替代已弃用的 substr
        const matchResult = format.match(new RegExp('(' + k + ')'));
        if (matchResult) {
          const matchedStr = matchResult[1];
          const formattedEl = typeof el === 'number' ? el.toString() : el;
          format = format.replace(
            matchedStr,
            matchedStr.length === 1 ? formattedEl : ('00' + formattedEl).slice(-matchedStr.length)
          );
        }
      }
    }
    return format;
  }
};

/**
 * 获取当前操作系统类型
 * @returns { 'Android' | 'iOS' | 'Windows' | 'MacOS' | 'Linux' | 'Unknown' } 操作系统类型
 */
export function getOS(): 'Android' | 'iOS' | 'Windows' | 'MacOS' | 'Linux' | 'Unknown' {
  const userAgent = navigator.userAgent;
  if (/Win/i.test(userAgent)) return 'Windows';
  if (/Mac/i.test(userAgent)) return 'MacOS';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'iOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
}
