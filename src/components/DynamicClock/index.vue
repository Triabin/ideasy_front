<!-- 动态粒子时钟组件 -->
<template>
  <canvas ref="canvasRef" class="bg-transparent block w-full h-full"></canvas>
</template>
<script lang="ts" setup>
import { ref, computed, useTemplateRef, onMounted, onBeforeUnmount, watch } from 'vue';
import { MyMathUtils, debounce } from '@/common/utils.ts';

// 父组件数据
const props = withDefaults(defineProps<{
  /** 粒子颜色 */
  color: string;
  /** 字体 */
  font?: string;
  /** 字体大小（仅作为基准参考值，实际渲染尺寸会根据画布（屏幕）大小自动等比缩放；传0表示完全自适应容器） */
  fontSize?: number;
  /** 粒子密度 */
  density: number;
}>(), {
  color: '#5445544D',
  font: 'sans-serif',
  fontSize: 240,
  density: 6
});

/** 时钟文本的宽高比（HH:mm:ss），保证数字在不同屏幕尺寸下始终保持比例、不变形 */
const TEXT_ASPECT_RATIO = 8 / 2;

class Particle {
  /** 粒子半径 */
  public r: number;
  /** 粒子在画布上的横坐标 */
  public x: number;
  /** 粒子在画布上的纵坐标 */
  public y: number;
  constructor(canvas: HTMLCanvasElement, scale: number) {
    // 粒子半径（随缩放系数等比变化，避免屏幕尺寸变化时粒子比例失真）
    this.r = MyMathUtils.randomInt(2 * scale, 7 * scale);
    // 环半径
    const ar = Math.min(canvas.width, canvas.height) / 2;
    // 粒子初始位置圆心与环圆心形成的夹角（随机）
    const rad = MyMathUtils.randomInt(0, 360) * Math.PI / 180; // 角度转换为弧度
    // 环圆心横坐标
    const ax = canvas.width / 2;
    // 环圆心纵坐标
    const ay = canvas.height / 2;
    const { x, y } = MyMathUtils.computeCoordinates(ar, rad, { x: ax, y: ay });
    // 粒子本身横坐标
    this.x = x;
    // 粒子本身纵坐标
    this.y = y;
  }

  // 绘制粒子
  draw() {
    if (!ctx.value) return;
    ctx.value.beginPath();
    ctx.value.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    ctx.value.fillStyle = props.color || '#5445544D';
    ctx.value.fill();
  }

  // 移动粒子
  moveTo(tx: number, ty: number) {
    const duration = 500; // 500ms运动时间
    // 设置起始坐标
    const sx = this.x, sy = this.y;
    // 计算横纵向速度
    const xSpeed = (tx - sx) / duration;
    const ySpeed = (ty - sy) / duration;
    // 记录开始运动时间
    const startTime = new Date();
    const _move = () => {
      const t = Date.now() - startTime.getTime(); // 当前已运动时间
      const currX = sx + xSpeed * t; // 当前x坐标 = 起始x坐标 + x坐标速度 * 当前已运动时间
      const currY = sy + ySpeed * t; // 当前y坐标 = 起始y坐标 + y坐标速度 * 当前已运动时间
      this.x = currX;
      this.y = currY;
      // 停止条件
      if (t >= duration) {
        this.x = tx;
        this.y = ty;
        return;
      }
      requestAnimationFrame(_move);
    }
    _move();
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
const ctx = ref<null | CanvasRenderingContext2D>(null);

/** 缩放系数：设备像素比 * 基准字号比例，保证数字随屏幕尺寸等比缩放且渲染清晰 */
const scale = computed(() => {
  const dpr = window.devicePixelRatio || 1;
  // fontSize <= 0 表示完全自适应容器；否则以 fontSize 为基准（fontSize/240）整体缩放
  return props.fontSize > 0 ? dpr * (props.fontSize / 240) : dpr;
});

// 用于存放粒子的数组
const particles: Particle[] = [];
// 清空画布函数
const clear = () => ctx.value && canvasRef.value && ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
// 重画粒子函数（每次移动都清空画布再重画，消除轨迹）
const draw = () => {
  if (!canvasRef.value) return;
  ctx.value = canvasRef.value.getContext('2d', { willReadFrequently: true });
  // 1. 清空画布
  clear();
  // 2. 更新粒子数量和坐标
  update();
  // 3. 画出每一个粒子
  for (let particle of particles) {
    particle.draw();
  }
  requestAnimationFrame(draw);
}

// 更新画布粒子
let curTimeText: string;
// resize后强制刷新标记（避免同一秒内尺寸变化但时间文本未变导致不重绘）
let forceUpdate = false;
const update = () => {
  if (!ctx.value || !canvasRef.value) return;
  // 判断差异，避免无意义更新（resize后强制刷新一次）
  const text = new Date().format('HH:mm:ss');
  if (forceUpdate) {
    forceUpdate = false;
  } else if (text === curTimeText) {
    return;
  }
  curTimeText = text;

  // 画文字
  const { width, height } = canvasRef.value;
  ctx.value.fillStyle = '#000';
  ctx.value.textBaseline = 'middle';
  // 字号与画布高度挂钩（height/2 = fontSize*scale），保证数字始终占满画布且比例固定
  ctx.value.font = `${height / 2}px 'DS-Digital', ${props.font}`;
  ctx.value.textAlign = 'center';
  ctx.value.fillText(text, width / 2, height / 2);

  // 获取像素信息
  const points = getPoints();
  // 获取像素点后清空画布，重新通过粒子画出时间文字
  clear();
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    let p = particles[i];
    if (!p) {
      p = new Particle(canvasRef.value, scale.value);
      particles.push(p);
    }
    p.moveTo(x, y);
  }
  if (points.length < particles.length) {
    particles.splice(points.length);
  }
};

// 从画布获取将要画的文字坐标
const getPoints = () => {
  if (!ctx.value || !canvasRef.value) return [];
  const points = [];
  const { data } = ctx.value.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);
  const gap = props.density * scale.value; // 设置步长，不需要获取所有像素点(步长越大，生成的粒子数量越小)；步长随缩放系数变化，保证不同屏幕下粒子密度视觉一致
  for (let i = 0; i < canvasRef.value.width; i += gap) {
    for (let j = 0; j < canvasRef.value.height; j += gap) {
      const index = (i + j * canvasRef.value.width) * 4; // 每连续的四位为一个像素点的信息
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      // 判断是否为黑色像素，为黑色像素则为所需坐标
      if (r === 0 && g === 0 && b === 0 && a === 255) {
        points.push([i, j]);
      }
    }
  }
  return points;
}

/**
 * 根据容器实际尺寸设置画布大小：
 * 画布始终保持固定宽高比（TEXT_ASPECT_RATIO），数字按高度等比缩放，
 * 从而在任意屏幕尺寸下保持比例、避免拉伸变形。
 */
const resizeCanvas = () => {
  if (!canvasRef.value) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvasRef.value.getBoundingClientRect();
  let cssWidth: number, cssHeight: number;
  if (props.fontSize > 0) {
    // 基准模式：逻辑字号为 fontSize，画布按 fontSize*scale 等比缩放
    const s = scale.value;
    // 手动+30，解决边缘切割问题
    cssWidth = props.fontSize * TEXT_ASPECT_RATIO * s / dpr + 30;
    cssHeight = props.fontSize * 2 * s / dpr;
    // 若超出容器宽度，则整体等比缩小（只取最小缩放系数，绝不放大超过容器）
    if (rect.width > 0) {
      const fit = Math.min(rect.width / cssWidth, rect.height > 0 ? rect.height / cssHeight : 1);
      if (fit < 1) {
        cssWidth *= fit;
        cssHeight *= fit;
      }
    }
  } else {
    // 完全自适应模式：以容器高度为准，宽度按比例推导；若超宽则以宽度为准反向推导高度
    cssHeight = rect.height || 100;
    cssWidth = cssHeight * TEXT_ASPECT_RATIO;
    if (rect.width > 0 && cssWidth > rect.width) {
      cssWidth = rect.width;
      cssHeight = cssWidth / TEXT_ASPECT_RATIO;
    }
  }
  canvasRef.value.style.width = `${cssWidth}px`;
  canvasRef.value.style.height = `${cssHeight}px`;
  canvasRef.value.width = Math.round(cssWidth * dpr);
  canvasRef.value.height = Math.round(cssHeight * dpr);
  // 尺寸变化后强制重绘一次粒子
  forceUpdate = true;
};

// 防抖处理resize事件，避免频繁重建画布
const onResize = debounce(resizeCanvas, 200);

onMounted(() => {
  if (canvasRef.value) {
    ctx.value = canvasRef.value.getContext('2d', {willReadFrequently: true});
    resizeCanvas();
    draw();
    window.addEventListener('resize', onResize);
  }
});

// 字体/密度等配置变化时同步更新画布尺寸
watch(scale, resizeCanvas);

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
});
</script>
