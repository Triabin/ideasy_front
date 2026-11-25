<!-- 动态粒子时钟组件 -->
<template>
  <canvas ref="canvasRef" class="block w-full h-full"></canvas>
</template>
<script lang="ts" setup>
import { computed, useTemplateRef, onMounted, onBeforeUnmount, watch } from 'vue';
import { MyMathUtils } from '@/common/utils.ts';

const props = withDefaults(defineProps<{
  /** 粒子颜色（可带透明度） */
  color?: string;
  /** 字体 */
  font?: string;
  /** 粒子密度：步长倍率，越大粒子越少 */
  density?: number;
}>(), {
  color: '#5445544D',
  font: 'sans-serif',
  density: 6,
});

/**
 * scale 仅表示设备像素比，用于把 CSS 像素换算为设备像素。
 * 字体大小、画布尺寸全部基于 canvas 实际 contentRect，不再依赖 props。
 */
const scale = computed(() => window.devicePixelRatio || 1);

const MOVE_DURATION = 600; // 归位动画时长（ms），拉长后先快后慢的缓动更明显

class Particle {
  /** 粒子半径（设备像素） */
  public r: number;
  /** 当前坐标（设备像素） */
  public x: number;
  public y: number;
  /** 动画起始坐标 */
  private sx = 0;
  private sy = 0;
  /** 动画目标坐标 */
  private tx = 0;
  private ty = 0;
  /** 本次动画的开始时间戳（performance.now()） */
  private moveStart = 0;
  /** 是否已到达目标 */
  public settled = true;

  constructor(canvasW: number, canvasH: number, scale: number) {
    this.r = MyMathUtils.randomInt(2 * scale, 7 * scale);
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const ringR = Math.min(canvasW, canvasH) / 2;
    const rad = Math.random() * Math.PI * 2;
    this.x = cx + Math.cos(rad) * ringR;
    this.y = cy + Math.sin(rad) * ringR;
    this.sx = this.x;
    this.sy = this.y;
    this.tx = this.x;
    this.ty = this.y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = props.color;
    ctx.fill();
  }

  /** 设置新的目标坐标；开始下一次归位动画 */
  moveTo(tx: number, ty: number, now: number) {
    if (tx === this.tx && ty === this.ty && this.settled) return;
    this.sx = this.x;
    this.sy = this.y;
    this.tx = tx;
    this.ty = ty;
    this.moveStart = now;
    this.settled = false;
  }

  /** 由主 rAF tick 驱动更新当前坐标 */
  tick(now: number) {
    if (this.settled) return;
    const elapsed = now - this.moveStart;
    const t = Math.min(1, elapsed / MOVE_DURATION);
    // 匀速线性移动
    const ease = t;
    this.x = this.sx + (this.tx - this.sx) * ease;
    this.y = this.sy + (this.ty - this.sy) * ease;
    if (t >= 1) {
      this.x = this.tx;
      this.y = this.ty;
      this.settled = true;
    }
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
let ctx: CanvasRenderingContext2D | null = null;
const particles: Particle[] = [];
let curTimeText = '';
let forceUpdate = false;
let rafId = 0;

/** 根据实际渲染尺寸调整画布像素缓冲区（设备像素） */
const applyCanvasSize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  // width / height 为 CSS 像素
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));
  // 设备像素缓冲区尺寸
  const dprW = Math.round(cssW * dpr);
  const dprH = Math.round(cssH * dpr);
  if (canvas.width !== dprW || canvas.height !== dprH) {
    canvas.width = dprW;
    canvas.height = dprH;
    forceUpdate = true;
  }
};

/** 在 canvas 上挂载 ResizeObserver：容器尺寸变化（包括旋转、flex 重排、窗口缩放）都会触发 */
let ro: ResizeObserver | null = null;
const setupResizeObserver = () => {
  if (!canvasRef.value) return;
  ro = new ResizeObserver(() => {
    applyCanvasSize();
  });
  ro.observe(canvasRef.value);
};

/** 采样画布上文字的黑色像素点（设备像素坐标） */
const getPoints = () => {
  const canvas = canvasRef.value;
  if (!ctx || !canvas) return [] as [number, number][];
  const points: [number, number][] = [];
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // 步长 = density * DPR，确保不同设备像素比下粒子密度视觉一致
  const gap = props.density * scale.value;
  for (let i = 0; i < canvas.width; i += gap) {
    for (let j = 0; j < canvas.height; j += gap) {
      const idx = (i + j * canvas.width) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      // 黑色 = 画在画布上的文字
      if (r === 0 && g === 0 && b === 0 && a === 255) {
        points.push([i, j]);
      }
    }
  }
  return points;
};

/** 计算能完整容纳 HH:mm:ss 的最大字号（设备像素） */
const computeFontSize = (text: string) => {
  if (!ctx || !canvasRef.value) return 0;
  const canvas = canvasRef.value;
  let fontSize = canvas.height / 2; // 基准：字号占画布高度一半
  ctx.font = `${fontSize}px 'DS-Digital', ${props.font}`;
  const metrics = ctx.measureText(text);
  // 如果太宽则按比例缩小，确保文字完整显示
  if (metrics.width > canvas.width * 0.9) {
    fontSize = Math.floor(fontSize * (canvas.width * 0.9) / metrics.width);
  }
  return Math.max(1, fontSize);
};

/** 主 rAF 循环：同一个时间基准驱动所有粒子的归位动画 */
const draw = (now: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  // 1. 先 tick 所有粒子（推进正在进行中的归位动画）
  for (const p of particles) p.tick(now);

  // 2. 判断是否需要重新采样目标坐标（秒级变化 + 尺寸变化 + 首次加载）
  const text = new Date().format('HH:mm:ss');
  const needUpdate = forceUpdate || text !== curTimeText;

  if (needUpdate) {
    curTimeText = text;
    forceUpdate = false;

    // 3. 临时画黑色文字以便采样像素
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'middle';
    ctx.font = `${computeFontSize(text)}px 'DS-Digital', ${props.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // 4. 采样黑色像素点作为粒子目标坐标
    const points = getPoints();

    // 5. 清空画布，用粒子替代文字
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 6. 为每个采样点分配/复用粒子并设定目标坐标；所有粒子共享 now 时间基准，动画同步
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      let p = particles[i];
      if (!p) {
        p = new Particle(canvas.width, canvas.height, scale.value);
        particles.push(p);
      }
      p.moveTo(x, y, now);
    }
    // 采样点变少，清理多余粒子
    if (points.length < particles.length) {
      particles.splice(points.length);
    }
  }

  // 7. 清空画布并重绘所有粒子（含正在动画中的）
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) p.draw(ctx);

  rafId = requestAnimationFrame(draw);
};

/** 粒子颜色/密度/字体变化时，重新采样 */
watch(() => [props.color, props.density, props.font], () => {
  forceUpdate = true;
});

onMounted(() => {
  applyCanvasSize();
  setupResizeObserver();
  rafId = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  ro?.disconnect();
  ro = null;
});
</script>
