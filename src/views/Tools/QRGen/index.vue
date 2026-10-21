<!-- 二维码生成页面路由组件 -->
<template>
  <div id="qr-gen" class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">二维码生成</h1>
    <p class="text-sm opacity-70 text-center">将文本、网址、Wi-Fi等常见内容生成二维码，支持尺寸、容错等级与颜色设置，可下载 PNG / SVG。</p>

    <!-- 简介 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">简介</h2>
        <p class="text-sm opacity-80">二维码（QR Code）是一种二维条码，通过在平面分布的黑白模块中编码数据，供扫描设备快速识读。它具备纠错能力（错误纠正等级 L/M/Q/H，最高可修复约30%的码字损坏），即使部分破损或遮挡仍可正常读取。本工具完全在浏览器本地生成，不会将你的内容上传到任何服务器。</p>
      </div>
    </div>

    <div class="flex flex-col xl:flex-row gap-4 grow">
      <!-- 左侧：内容与设置 -->
      <div class="flex flex-col gap-4 xl:w-[52%] min-w-0">
        <!-- 内容输入 -->
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="card-title text-base">内容</h2>
              <div class="inline-flex flex-wrap gap-1 ml-auto">
                <button
                    v-for="t in QUICK_TYPES"
                    :key="t.value"
                    class="btn btn-xs"
                    :class="quickType === t.value ? 'btn-primary' : ''"
                    @click="switchQuickType(t.value)"
                >{{ t.label }}</button>
              </div>
            </div>

            <!-- 文本/网址：直接编辑 -->
            <textarea
                v-if="quickType === 'text' || quickType === 'url'"
                v-model="rawInput"
                class="textarea textarea-bordered w-full font-mono text-sm min-h-28"
                :placeholder="quickType === 'url' ? '例如：https://example.com' : '要编码的任意文本内容'"
            ></textarea>

            <!-- Wi-Fi 表单 -->
            <div v-else-if="quickType === 'wifi'" class="flex flex-col gap-3 text-sm">
              <label class="form-control w-full">
                <span class="label-text mb-1">网络名称（SSID）<i class="text-error">*</i></span>
                <input v-model="wifi.ssid" type="text" class="input input-bordered input-sm w-full" placeholder="例如：MyHome_5G"/>
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">加密方式</span>
                <select v-model="wifi.encryption" class="select select-bordered select-sm w-full">
                  <option v-for="e in WIFI_ENCRYPTIONS" :key="e.value" :value="e.value">{{ e.label }}</option>
                </select>
              </label>
              <label v-if="wifi.encryption !== 'nopass'" class="form-control w-full">
                <span class="label-text mb-1">密码</span>
                <input v-model="wifi.password" type="text" class="input input-bordered input-sm w-full font-mono" placeholder="Wi-Fi 连接密码"/>
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input v-model="wifi.hidden" type="checkbox" class="checkbox checkbox-sm"/>
                <span class="label-text">隐藏网络</span>
              </label>
            </div>

            <!-- 电话 -->
            <label v-else-if="quickType === 'tel'" class="form-control w-full text-sm">
              <span class="label-text mb-1">电话号码<i class="text-error">*</i></span>
              <input v-model="tel.number" type="text" class="input input-bordered input-sm w-full" placeholder="例如：+8613800138000"/>
            </label>

            <!-- 短信 -->
            <div v-else-if="quickType === 'sms'" class="flex flex-col gap-3 text-sm">
              <label class="form-control w-full">
                <span class="label-text mb-1">接收号码<i class="text-error">*</i></span>
                <input v-model="sms.number" type="text" class="input input-bordered input-sm w-full" placeholder="例如：10086"/>
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">预填内容（可选）</span>
                <textarea v-model="sms.body" class="textarea textarea-bordered w-full text-sm min-h-20" placeholder="扫码后短信编辑框中预先填入的内容"></textarea>
              </label>
            </div>

            <!-- 邮箱 -->
            <div v-else-if="quickType === 'email'" class="flex flex-col gap-3 text-sm">
              <label class="form-control w-full">
                <span class="label-text mb-1">收件邮箱<i class="text-error">*</i></span>
                <input v-model="email.address" type="email" class="input input-bordered input-sm w-full" placeholder="例如：someone@example.com"/>
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">主题（可选）</span>
                <input v-model="email.subject" type="text" class="input input-bordered input-sm w-full" placeholder="邮件主题"/>
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">正文（可选）</span>
                <textarea v-model="email.body" class="textarea textarea-bordered w-full text-sm min-h-20" placeholder="邮件正文"></textarea>
              </label>
            </div>

            <!-- 位置 -->
            <div v-else-if="quickType === 'geo'" class="flex flex-col gap-3 text-sm">
              <div class="flex flex-wrap gap-3">
                <label class="form-control grow min-w-32">
                  <span class="label-text mb-1">纬度<i class="text-error">*</i></span>
                  <input v-model="geo.lat" type="text" class="input input-bordered input-sm w-full" placeholder="例如：39.90469"/>
                </label>
                <label class="form-control grow min-w-32">
                  <span class="label-text mb-1">经度<i class="text-error">*</i></span>
                  <input v-model="geo.lng" type="text" class="input input-bordered input-sm w-full" placeholder="例如：116.40717"/>
                </label>
              </div>
              <label class="form-control w-full">
                <span class="label-text mb-1">地点名称（可选）</span>
                <input v-model="geo.label" type="text" class="input input-bordered input-sm w-full" placeholder="例如：天安门"/>
              </label>
            </div>

            <!-- 实时预览生成的原始文本 -->
            <div class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <i class="text-xs opacity-60">实际编码内容</i>
                <p class="font-mono text-sm break-all whitespace-pre-wrap">{{ content || '（内容为空）' }}</p>
              </div>
              <div class="shrink-0 opacity-60 cursor-pointer" title="点击复制" @click="copy(content)">
                <Copied v-if="copiedText === content && content" :size="16" :twClasses="['fill-success']"/>
                <Copy v-else :size="16"/>
              </div>
            </div>
          </div>
        </div>

        <!-- 样式设置 -->
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body gap-3">
            <h2 class="card-title text-base">样式设置</h2>
            <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div class="shrink-0">
                <span class="opacity-60 mr-2">尺寸：</span>
                <div class="btn-group inline-block align-middle">
                  <button
                      v-for="s in SIZE_OPTIONS"
                      :key="s"
                      class="btn btn-sm"
                      :class="width === s ? 'btn-primary' : ''"
                      @click="width = s"
                  >{{ s }}px</button>
                </div>
              </div>

              <label class="join shrink-0" title="边距，单位为模块数">
                <button class="btn btn-sm join-item pointer-events-none">边距</button>
                <input type="number" class="input input-sm join-item w-16 font-mono" min="0" max="16" v-model.number="margin"/>
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div class="shrink-0">
                <span class="opacity-60 mr-2">容错等级：</span>
                <div class="btn-group inline-block align-middle">
                  <button
                      v-for="l in ERROR_CORRECTION_LEVELS"
                      :key="l.value"
                      class="btn btn-sm"
                      :class="ecLevel === l.value ? 'btn-primary' : ''"
                      :title="l.desc"
                      @click="ecLevel = l.value"
                  >{{ l.label }}</button>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div class="flex items-center gap-2 shrink-0">
                <span class="opacity-60">前景色：</span>
                <input type="color" v-model="darkColor" class="color-input w-10 h-8 rounded cursor-pointer border border-base-300 bg-base-100 p-0.5"/>
                <span class="font-mono text-xs">{{ darkColor }}</span>
                <label class="join join-vertical sm:join-horizontal ml-1" title="前景不透明度">
                  <button class="btn btn-xs join-item pointer-events-none w-10">透明</button>
                  <input type="number" class="input input-xs join-item w-16 font-mono" min="0" max="100" v-model.number="darkAlpha"/>
                </label>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="opacity-60">背景色：</span>
                <input type="color" v-model="lightColor" class="color-input w-10 h-8 rounded cursor-pointer border border-base-300 bg-base-100 p-0.5"/>
                <span class="font-mono text-xs">{{ lightColor }}</span>
                <label class="join join-vertical sm:join-horizontal ml-1" title="背景不透明度">
                  <button class="btn btn-xs join-item pointer-events-none w-10">透明</button>
                  <input type="number" class="input input-xs join-item w-16 font-mono" min="0" max="100" v-model.number="lightAlpha"/>
                </label>
              </div>
              <button class="btn btn-sm btn-ghost shrink-0" @click="resetColors">恢复黑白</button>
            </div>
            <p class="text-xs opacity-60">提示：背景设为全透明时，二维码将只有码点；若需正常扫码，请保证码点与承载底色之间有足够对比度（一般深色码点 + 浅色底最稳妥）。</p>
          </div>
        </div>
      </div>

      <!-- 右侧：预览与下载 -->
      <div class="card bg-base-200 shadow-sm xl:w-[48%] min-w-0">
        <div class="card-body gap-3">
          <h2 class="card-title text-base">预览</h2>
          <div class="checkerboard-bg rounded-lg border border-base-300 p-4 flex items-center justify-center min-h-64 overflow-auto">
            <div v-if="errorMsg" class="text-error text-sm text-center px-4">
              {{ errorMsg }}
            </div>
            <div v-else-if="!hasContent" class="opacity-50 text-sm text-center px-4">
              请输入内容后自动生成二维码。
            </div>
            <div v-else ref="qrBox" class="max-w-full flex items-center justify-center"></div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary btn-sm shrink-0" :disabled="!canExport" @click="downloadPng">下载 PNG</button>
            <button class="btn btn-sm shrink-0" :disabled="!canExport" @click="downloadSvgFile">下载 SVG</button>
            <button class="btn btn-sm btn-ghost shrink-0" :disabled="!canExport" @click="copyToClipboard">复制到剪贴板</button>
            <span v-if="svgText" class="badge badge-outline font-mono shrink-0">{{ width }}×{{ width }}px</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { computed, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { copyText, popupTip } from '@/common/utils';
import {
  ERROR_CORRECTION_LEVELS,
  SIZE_OPTIONS,
  QUICK_TYPES,
  WIFI_ENCRYPTIONS,
  buildWifiString,
  hexWithAlpha,
  generateSvg,
  generatePngDataURL,
  downloadDataURL,
  downloadSVG,
  type ErrorCorrectionLevel,
  type QuickType,
} from './qrGenerator';

/** 当前快捷类型 */
const quickType = ref<QuickType>('text');
/** 文本/网址模式的原始内容 */
const rawInput = ref('');
/** 实际编码内容（快捷表单模式下由表单拼装） */
const content = ref('');

/** Wi-Fi 表单 */
const wifi = ref({ ssid: '', encryption: 'WPA' as 'WPA' | 'nopass' | 'WEP', password: '', hidden: false });
/** 电话表单 */
const tel = ref({ number: '' });
/** 短信表单 */
const sms = ref({ number: '', body: '' });
/** 邮箱表单 */
const email = ref({ address: '', subject: '', body: '' });
/** 位置表单 */
const geo = ref({ lat: '', lng: '', label: '' });

/** 样式参数 */
const width = ref<number>(256);
const margin = ref<number>(2);
const ecLevel = ref<ErrorCorrectionLevel>('M');
const darkColor = ref('#000000');
const lightColor = ref('#FFFFFF');
const darkAlpha = ref(100);
const lightAlpha = ref(100);

/** 生成结果 */
const svgText = ref('');
const errorMsg = ref('');
/** 复制图标反馈 */
const copiedText = ref('');
let copyTimer: ReturnType<typeof setTimeout> | null = null;

/** 预览容器 */
const qrBox = ref<HTMLDivElement>();

const hasContent = computed(() => !!content.value.trim());
const canExport = computed(() => hasContent.value && !errorMsg.value && !!svgText.value);

/** 根据快捷类型拼装实际编码内容 */
function composeContent(): string {
  switch (quickType.value) {
    case 'text':
    case 'url':
      return rawInput.value;
    case 'wifi':
      if (!wifi.value.ssid.trim()) return '';
      return buildWifiString(wifi.value.ssid.trim(), wifi.value.password, wifi.value.encryption, wifi.value.hidden);
    case 'tel':
      return tel.value.number.trim() ? `tel:${tel.value.number.trim()}` : '';
    case 'sms': {
      const num = sms.value.number.trim();
      if (!num) return '';
      // SMSTO:号码:主题(留空):正文（各厂商扫码器通用格式）
      return `SMSTO:${num}::${sms.value.body}`;
    }
    case 'email': {
      const addr = email.value.address.trim();
      if (!addr) return '';
      const params: string[] = [];
      if (email.value.subject.trim()) params.push(`subject=${encodeURIComponent(email.value.subject.trim())}`);
      if (email.value.body) params.push(`body=${encodeURIComponent(email.value.body)}`);
      return `mailto:${addr}${params.length ? '?' + params.join('&') : ''}`;
    }
    case 'geo': {
      const lat = geo.value.lat.trim(), lng = geo.value.lng.trim();
      if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) return '';
      let str = `geo:${lat},${lng}`;
      if (geo.value.label.trim()) str += `?q=${encodeURIComponent(geo.value.label.trim())}`;
      return str;
    }
    default:
      return rawInput.value;
  }
}

/** 切换快捷类型时保留文本模式下的原始输入 */
function switchQuickType(t: QuickType) {
  if (t === quickType.value) return;
  // 从文本/网址切走再切回时，rawInput 保持不变
  quickType.value = t;
}

/** 重置颜色为默认黑白 */
function resetColors() {
  darkColor.value = '#000000';
  lightColor.value = '#FFFFFF';
  darkAlpha.value = 100;
  lightAlpha.value = 100;
}

/** 渲染SVG到预览容器 */
async function renderPreview() {
  await nextTick();
  const box = qrBox.value;
  if (!box) return;
  box.innerHTML = svgText.value;
  const svgEl = box.querySelector('svg');
  if (svgEl) {
    // 显示尺寸跟随所选宽度，但不超过容器宽度
    (svgEl as SVGElement).style.width = '100%';
    (svgEl as SVGElement).style.maxWidth = `${width.value}px`;
    (svgEl as SVGElement).style.height = 'auto';
  }
}

/** 生成二维码 */
async function regenerate() {
  content.value = composeContent();
  if (!hasContent.value) {
    svgText.value = '';
    errorMsg.value = '';
    await renderPreview();
    return;
  }
  try {
    svgText.value = await generateSvg(content.value, {
      margin: Math.min(Math.max(Math.trunc(margin.value) || 0, 0), 16),
      width: width.value,
      ecLevel: ecLevel.value,
      darkColor: hexWithAlpha(darkColor.value, darkAlpha.value),
      lightColor: hexWithAlpha(lightColor.value, lightAlpha.value),
    });
    errorMsg.value = '';
  } catch (e) {
    svgText.value = '';
    errorMsg.value = e instanceof Error && e.message.includes('too long')
      ? '内容过长，超出二维码容量上限，请精简内容或降低容错等级。'
      : `生成失败：${e instanceof Error ? e.message : String(e)}`;
  }
  await renderPreview();
}

// 监听所有影响输出的参数，实时重新生成
watch([rawInput, wifi, tel, sms, email, geo, quickType, width, margin, ecLevel, darkColor, lightColor, darkAlpha, lightAlpha],
  debounceRegen(), { deep: true });

/** 防抖包装（避免高频输入时反复生成） */
let regenTimer: ReturnType<typeof setTimeout> | null = null;
function debounceRegen() {
  return () => {
    if (regenTimer) clearTimeout(regenTimer);
    regenTimer = setTimeout(regenerate, 150);
  };
}

/** 下载PNG（按所选尺寸输出） */
async function downloadPng() {
  try {
    const dataURL = await generatePngDataURL(content.value, {
      margin: Math.min(Math.max(Math.trunc(margin.value) || 0, 0), 16),
      width: width.value,
      ecLevel: ecLevel.value,
      darkColor: hexWithAlpha(darkColor.value, darkAlpha.value),
      lightColor: hexWithAlpha(lightColor.value, lightAlpha.value),
    });
    downloadDataURL(dataURL, `qrcode_${Date.now()}.png`);
    popupTip('已开始下载PNG图片', 'success', 1500);
  } catch (e) {
    popupTip(`导出PNG失败：${e instanceof Error ? e.message : String(e)}`, 'error');
  }
}

/** 下载SVG矢量文件 */
function downloadSvgFile() {
  if (!svgText.value) return;
  downloadSVG(svgText.value, `qrcode_${Date.now()}.svg`);
  popupTip('已开始下载SVG矢量图', 'success', 1500);
}

/** 复制二维码图片到剪贴板 */
async function copyToClipboard() {
  try {
    const dataURL = await generatePngDataURL(content.value, {
      margin: Math.min(Math.max(Math.trunc(margin.value) || 0, 0), 16),
      width: width.value,
      ecLevel: ecLevel.value,
      darkColor: hexWithAlpha(darkColor.value, darkAlpha.value),
      lightColor: hexWithAlpha(lightColor.value, lightAlpha.value),
    });
    const blob = await (await fetch(dataURL)).blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    popupTip('二维码图片已复制到剪贴板', 'success', 1500);
  } catch {
    popupTip('复制失败，当前浏览器可能不支持图片写入剪贴板，请使用下载功能', 'warning');
  }
}

/** 复制文本并显示反馈图标 */
const copy = async (text: string) => {
  if (!text) return;
  await copyText(text);
  copiedText.value = text;
  popupTip('内容已复制', 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1500);
};

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
  if (regenTimer) clearTimeout(regenTimer);
});
</script>

<style lang="css" scoped>
/* 棋盘格背景，便于观察透明区域 */
.checkerboard-bg {
  background-color: var(--color-base-100, #fff);
  background-image:
    linear-gradient(45deg, rgba(128, 128, 128, 0.15) 25%, transparent 25%, transparent 75%, rgba(128, 128, 128, 0.15) 75%),
    linear-gradient(45deg, rgba(128, 128, 128, 0.15) 25%, transparent 25%, transparent 75%, rgba(128, 128, 128, 0.15) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
}
/* 原生颜色选择器美化 */
.color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}
.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 0.25rem;
}
</style>
