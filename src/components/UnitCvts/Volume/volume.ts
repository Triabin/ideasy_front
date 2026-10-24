import type {UnitDef} from "@/components/UnitCvts/units.ts";

/** 基准单位ID（升） */
export const BASE_ID = 'dm3';

/** 所有支持的单位 */
export const UNITS: UnitDef[] = [
  { id: 'mm3', name: '立方毫米', symbol: 'mm³', factor: 1e-6 },
  { id: 'cm3', name: '立方厘米（毫升）', symbol: 'cm³/mL', factor: 1e-3 },
  { id: 'dm3', name: '立方分米（升）', symbol: 'dm³/L', factor: 1 },
  { id: 'm3', name: '立方米', symbol: 'm³', factor: 1000 },
  { id: 'haom', name: '方（工程）', symbol: '方', factor: 1000 },
  { id: 'kl', name: '千升', symbol: 'kL', factor: 1e4 },
  { id: 'galUS', name: '加仑（美制）', symbol: 'gal', factor: 3.785411784 },
  { id: 'galUK', name: '加仑（英制）', symbol: 'gal(UK)', factor: 4.54609 },
  { id: 'qt', name: '夸脱（美制）', symbol: 'qt', factor: 0.946352946 },
  { id: 'pt', name: '品脱（英制）', symbol: 'pt(UK)', factor: 0.56826125 },
  { id: 'floz', name: '液盎司（美制）', symbol: 'fl oz', factor: 0.0295735295625 },
  { id: 'cup', name: '杯（美制）', symbol: 'cup', factor: 0.2365882365 },
  { id: 'bbl', name: '桶（石油）', symbol: 'bbl', factor: 158.987294928 },
  { id: 'ft3', name: '立方英尺', symbol: 'ft³', factor: 28.316846592 },
  { id: 'in3', name: '立方英寸', symbol: 'in³', factor: 0.016387064 },
  { id: 'yd3', name: '立方码', symbol: 'yd³', factor: 764.554857984 },
];

/** 常用换算关系（包括俗语） */
export const COMMONS: [string, string][] = [
  ['1 立方米 (m³)', '1000 升'],
  ['1 升 (L)', '1000 毫升'],
  ['1 加仑（美）', '≈ 3.785 升'],
  ['1 品脱（英）', '≈ 0.568 升'],
  ['1 立方英尺', '≈ 28.32 升'],
]
