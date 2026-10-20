/**
 * 单位换算核心逻辑（纯数据 + 纯函数，无 DOM 依赖）
 *
 * 设计说明：
 * - 线性单位（长度、重量、体积、面积、能量、功率、货币等）统一用
 *   `factor`（1 个该单位等于多少基准单位）与 `offset` 描述，换算公式：
 *      基准值 = value * factor + offset
 *      目标值 = (基准值 - offset) / factor
 * - 人民币（CNY）以「元」为基准单位，厘/毫通过小数因子表示；
 * - 温度使用专用换算函数（摄氏度为中间量）。
 */
/**
 * 解析用户输入的数值，支持千分位逗号、下划线、前后空白
 * @returns {number|null} 非法输入返回 null
 */
export function parseNumber(raw: string): number | null {
  const s = String(raw ?? '').trim().replace(/[,_\s]/g, '');
  if (!s) return null;
  if (!/^([+\-])?(\d+(\.\d*)?|\.\d+)(e([+\-])?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * 智能格式化数字：普通范围保留有效小数并去尾零，过大/过小使用科学计数法
 */
export function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e15 || abs < 1e-9) {
    return v.toExponential(6).replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e');
  }
  let s = v.toFixed(10);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

/**
 * 千分位格式化（最多保留 6 位小数，自动去尾零）
 */
export function withThousands(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const fixed = Math.abs(v) < 1e15 ? v.toFixed(6) : v.toExponential(6);
  if (fixed.includes('e')) return fixed;
  const [int, dec] = fixed.split('.');
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decFmt = dec ? dec.replace(/0+$/, '') : '';
  return decFmt ? `${intFmt}.${decFmt}` : intFmt;
}

/** 单个单位定义 */
export interface UnitDef {
  /** 单位 id（类别内唯一） */
  id: string;
  /** 中文名称 */
  name: string;
  /** 符号/英文缩写 */
  symbol: string;
  /** 相对基准单位的换算因子（1 该单位 = factor 基准单位），默认 1 */
  factor?: number;
  /** 偏移量（基准值 = value * factor + offset），目前仅货币类使用 */
  offset?: number;
}

/**
 * 将数值从源单位换算到目标单位通用函数
 * @param units 所有单位
 * @param value 数值（已完成解析）
 * @param srcId 源单位 id
 * @param dstId 目标单位 id
 * @param cvtFn 转换逻辑（默认为通用转换逻辑，如果有区别，可自定义）
 */
export function convert(units: UnitDef[], value: number, srcId: string, dstId: string, cvtFn: CvtFn = defaultCvt): number {
  const src = units.find(u => u.id === srcId);
  const dst = units.find(u => u.id === dstId);
  if (!src) throw new Error(`ID为 ${srcId} 的单位不存在`);
  if (!dst) throw new Error(`ID为 ${dstId} 的单位不存在`);
  return cvtFn(src, dst, value);
}

/** 单位换算函数签名 */
type CvtFn = (srcUnit: UnitDef, dstUnit: UnitDef, value: number) => number;
/** 默认通用换算逻辑 */
const defaultCvt: CvtFn = (srcUnit, dstUnit, value) => {
  const base = value * (srcUnit.factor ?? 1) + (srcUnit.offset ?? 0);
  return (base - (dstUnit.offset ?? 0)) / (dstUnit.factor ?? 1);
};
