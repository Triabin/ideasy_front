<!-- 动态粒子时钟组件 -->
<template>
  <canvas ref="canvasRef" class="bg-transparent block w-full h-full"></canvas>
</template>
<script lang="ts" setup>
import { ref, useTemplateRef, onMounted } from 'vue';
import { MyMathUtils } from '@/common/utils.ts';

// 父组件数据
const props = defineProps({
  // 粒子颜色
  color: {
    type: String,
    default: "#5445544D"
  },

  // 字体
  font: {
    type: String,
    default: 'sans-serif'
  },

  // 字体大小
  fontSize: {
    type: Number,
    default: 240
  },

  // 粒子密度
  density: {
    type: Number,
    default: 6
  }
});
class Particle {
  /** 粒子半径 */
  public r: number;
  /** 粒子在画布上的横坐标 */
  public x: number;
  /** 粒子在画布上的纵坐标 */
  public y: number;
  constructor(canvas: HTMLCanvasElement) {
    // 粒子半径
    this.r = MyMathUtils.randomInt(2 * devicePixelRatio, 7 * devicePixelRatio);
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
const update = () => {
  if (!ctx.value || !canvasRef.value) return;
  // 判断差异，避免无意义更新
  const text = new Date().format('HH:mm:ss');
  if (text === curTimeText) {
    return;
  }
  curTimeText = text;

  // 画文字
  const { width, height } = canvasRef.value;
  ctx.value.fillStyle = '#000';
  ctx.value.textBaseline = 'middle';
  ctx.value.font = `${props.fontSize * devicePixelRatio}px 'DS-Digital', ${props.font}`;
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
      p = new Particle(canvasRef.value);
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
  const gap = props.density; // 设置步长，不需要获取所有像素点(步长越大，生成的粒子数量越小)
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

onMounted(() => {
  if (canvasRef.value) {
    ctx.value = canvasRef.value.getContext('2d', {willReadFrequently: true});
    canvasRef.value.width = props.fontSize * 8 * devicePixelRatio;
    canvasRef.value.height = props.fontSize * 2 * devicePixelRatio;
    draw();
  }
});
</script>
