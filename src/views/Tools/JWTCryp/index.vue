<!-- JWT加解密页面路由组件 -->
<template>
  <div class="h-full max-h-full w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">JWT加解密</h1>
    <p class="text-sm opacity-70 text-center">
      JSON Web Token 解析、签名验证与生成工具，支持 HS256 / HS384 / HS512，所有计算均在本地浏览器完成。
    </p>

    <!-- 模式切换 -->
    <div class="flex justify-center">
      <div class="join">
        <button class="btn join-btn btn-sm" :class="mode === 'decode' ? 'btn-primary' : ''" @click="mode = 'decode'">解码/验证</button>
        <button class="btn join-btn btn-sm" :class="mode === 'encode' ? 'btn-primary' : ''" @click="mode = 'encode'">编码/签名</button>
      </div>
    </div>

    <!-- ==================== 解码模式 ==================== -->
    <template v-if="mode === 'decode'">
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <h2 class="card-title text-base">输入Token</h2>
          <textarea
              class="textarea textarea-bordered w-full font-mono min-h-28"
              v-model="decodeInput"
              placeholder="请粘贴 JWT 字符串（形如 xxx.yyy.zzz）……"
              spellcheck="false"
          ></textarea>
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <span v-if="decoded" class="badge badge-outline font-mono">{{ decodeInput.trim().length }} 字符</span>
            <button class="btn btn-sm btn-ghost ml-auto" @click="clearDecode" :disabled="!decodeInput">清空</button>
          </div>
        </div>
      </div>

      <!-- 解析错误提示 -->
      <div v-if="decodeError" class="alert alert-error py-2 text-sm">
        <span>{{ decodeError }}</span>
      </div>

      <template v-if="decoded">
        <!-- Header / Payload 展示 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="card bg-base-200 shadow-sm">
            <div class="card-body gap-2">
              <h2 class="card-title text-base">头部（Header）</h2>
              <pre class="mockup-code text-sm overflow-x-auto pl-4"><code>{{ prettyJson(decoded.header) }}</code></pre>
            </div>
          </div>
          <div class="card bg-base-200 shadow-sm">
            <div class="card-body gap-2">
              <h2 class="card-title text-base">载荷（Payload）</h2>
              <pre class="mockup-code text-sm overflow-x-auto pl-4"><code>{{ prettyJson(decoded.payload) }}</code></pre>
              <!-- 时间声明提示 -->
              <div class="flex flex-wrap gap-2 text-xs">
                <span v-if="expState !== 'none'" class="badge" :class="expState === 'valid' ? 'badge-success' : 'badge-error'">
                  {{ expState === 'valid' ? `未过期：${formatUnix(Number(decoded.payload.exp))}` : `已过期：${formatUnix(Number(decoded.payload.exp))}` }}
                </span>
                <span v-if="typeof decoded.payload.iat === 'number'" class="badge badge-outline">签发：{{ formatUnix(decoded.payload.iat) }}</span>
                <span v-if="typeof decoded.payload.nbf === 'number'" class="badge badge-outline">生效：{{ formatUnix(decoded.payload.nbf) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 签名验证区 -->
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body gap-3">
            <h2 class="card-title text-base">
              签名验证（{{ decoded.header.alg }}）
              <i class="text-xs text-info-content/50 font-normal">
                ⚠️&nbsp;输入服务端用于签发该 Token 的密钥，验证签名是否被篡改
              </i>
            </h2>
            <div class="tooltip tooltip-bottom">
              <input
                  type="text"
                  class="input input-bordered w-full font-mono"
                  v-model="verifySecret"
                  placeholder="请输入用于验证的密钥（Secret）……"
                  spellcheck="false"
              />
            </div>
            <div v-if="verifyState === 'checking'" class="text-sm opacity-60">验证中……</div>
            <div v-else-if="verifyState === 'pass'" class="alert alert-success py-2 text-sm">
              <span>✅ 签名有效：该 Token 由此密钥签发且未被篡改</span>
            </div>
            <div v-else-if="verifyState === 'fail'" class="alert alert-error py-2 text-sm">
              <span>❌ 签名无效：密钥不匹配或 Token 已被篡改</span>
            </div>
            <div v-else-if="decoded.header.alg === 'none'" class="alert alert-warning py-2 text-sm">
              <span>⚠️ 该 Token 使用 none 算法（无签名），存在安全风险，切勿在生产环境接受此类 Token！</span>
            </div>
            <div class="text-sm break-all font-mono opacity-70">
              签名段：<span class="select-all">{{ decoded.signature || '（空）' }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ==================== 编码模式 ==================== -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- 头部编辑 -->
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body gap-2">
            <div class="flex items-center justify-between">
              <h2 class="card-title text-base">头部（Header）</h2>
              <select class="select select-sm w-28" v-model="encodeAlg">
                <option v-for="a in ALG_OPTIONS" :key="a.value" :value="a.value">{{ a.label }}</option>
              </select>
            </div>
            <textarea
                class="textarea textarea-bordered w-full font-mono min-h-28"
                v-model="headerText"
                spellcheck="false"
            ></textarea>
            <i class="text-xs opacity-60">{{ currentAlgDesc }}</i>
          </div>
        </div>
        <!-- 载荷编辑 -->
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body gap-2">
            <h2 class="card-title text-base">载荷（Payload）</h2>
            <textarea
                class="textarea textarea-bordered w-full font-mono min-h-28"
                v-model="payloadText"
                spellcheck="false"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- 时间声明快捷设置 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <h2 class="card-title text-base">时间声明</h2>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <label class="label cursor-pointer gap-2 p-0">
              <span class="label-text">iat（签发时间）</span>
              <input type="checkbox" class="toggle toggle-sm toggle-primary" v-model="iatEnabled"/>
            </label>
            <label class="label cursor-pointer gap-2 p-0">
              <span class="label-text">nbf（生效时间）</span>
              <input type="checkbox" class="toggle toggle-sm toggle-primary" v-model="nbfEnabled"/>
            </label>
            <label class="label cursor-pointer gap-2 p-0">
              <span class="label-text">exp（过期时间）</span>
              <input type="checkbox" class="toggle toggle-sm toggle-primary" v-model="expEnabled"/>
            </label>
            <div v-show="expEnabled || nbfEnabled" class="flex items-center gap-2">
              <span class="opacity-70">相对当前时间：</span>
              <input
                  type="number"
                  class="input input-sm input-bordered w-24"
                  v-model.number="claimOffset"
                  min="0"
              />
              <select class="select select-sm w-24" v-model="claimUnit">
                <option value="minute">分钟</option>
                <option value="hour">小时</option>
                <option value="day">天</option>
              </select>
              <span class="badge badge-outline font-mono">{{ secondsToReadable(claimSeconds) }}</span>
            </div>
          </div>
          <p class="text-xs opacity-60">开启后，点击“生成Token”时将自动写入对应的时间戳声明（覆盖原有同名字段）。</p>
        </div>
      </div>

      <!-- 密钥与输出 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <h2 class="card-title text-base">
            密钥（Secret）
            <i class="text-xs text-info-content/50 font-normal">
              ⚠️&nbsp;输入服务端用于签发该 Token 的密钥，对编码结果进行加密
            </i>
          </h2>
          <div class="join w-full">
            <input
                type="text"
                class="input input-bordered join-item w-full font-mono"
                v-model="encodeSecret"
                placeholder="请输入签名密钥……"
                spellcheck="false"
            />
            <button class="btn join-item btn-sm" @click="randomSecret" title="随机生成一个256位密钥">随机</button>
          </div>
          <button class="btn btn-primary btn-sm w-fit" @click="generate" :disabled="generating">
            {{ generating ? '生成中…' : '生成 Token' }}
          </button>
        </div>
      </div>

      <!-- 生成结果 -->
      <div v-if="encodeError" class="alert alert-error py-2 text-sm">
        <span>{{ encodeError }}</span>
      </div>
      <div v-if="encodedToken" class="card bg-base-200 shadow-sm">
        <div class="card-body gap-2">
          <div class="flex items-center justify-between">
            <h2 class="card-title text-base">生成结果</h2>
            <div class="flex items-center gap-2">
              <Copied v-if="copied" :size="18" :twClasses="['fill-success']"/>
              <button class="btn btn-sm btn-ghost gap-1" @click="copy(encodedToken)">
                <Copy :size="18"/>复制
              </button>
            </div>
          </div>
          <span class="font-mono break-all text-sm select-all p-3 rounded-lg bg-base-100">{{ encodedToken }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import {
  ALG_OPTIONS,
  applyTimeClaims,
  buildJwt,
  expStatus,
  formatUnix,
  hmacVerify,
  parseJwt,
  prettyJson,
  safeJsonParse,
  secondsToReadable,
  bytesToBase64Url,
  type JwtParsed,
} from './jwtUtils';
import { copyText, popupTip } from '@/common/utils.ts';

const mode = ref<'decode' | 'encode'>('decode');

/* ------------------------- 解码模式 ------------------------- */

const DEFAULT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const decodeInput = ref<string>(DEFAULT_TOKEN);
const verifySecret = ref<string>('your-256-bit-secret');
const decoded = ref<JwtParsed | null>(null);
const decodeError = ref<string>('');
const verifyState = ref<'idle' | 'checking' | 'pass' | 'fail'>('idle');

const expState = computed(() => decoded.value ? expStatus(decoded.value.payload.exp) : 'none');

/** 兼容不同密钥命名（HS256 经典示例密钥为 your-256-bit-secret） */
async function doVerify() {
  if (!decoded.value) return;
  const alg = decoded.value.header.alg;
  const algInfo = ALG_OPTIONS.find(a => a.value === alg);
  if (!algInfo?.hash || !verifySecret.value) {
    verifyState.value = 'idle';
    return;
  }
  verifyState.value = 'checking';
  const token = decoded.value;
  try {
    const ok = await hmacVerify(token.signingInput, token.signature, verifySecret.value, algInfo.hash);
    // 防止异步竞态：仅当仍是同一次解析结果时更新状态
    if (decoded.value !== token) return;
    verifyState.value = ok ? 'pass' : 'fail';
  } catch {
    if (decoded.value === token) verifyState.value = 'fail';
  }
}

function doDecode() {
  decodeError.value = '';
  decoded.value = null;
  verifyState.value = 'idle';
  const input = decodeInput.value.trim();
  if (!input) return;
  try {
    decoded.value = parseJwt(input);
    if (decoded.value.header.alg === 'none') verifyState.value = 'idle';
    else doVerify();
  } catch (e: any) {
    decodeError.value = e?.message ?? '解析失败';
  }
}

const clearDecode = () => {
  decodeInput.value = '';
};

let decodeTimer: ReturnType<typeof setTimeout> | null = null;
watch([decodeInput], () => {
  if (decodeTimer) clearTimeout(decodeTimer);
  decodeTimer = setTimeout(doDecode, 200);
}, { immediate: true });
watch(verifySecret, () => doVerify());

/* ------------------------- 编码模式 ------------------------- */

const encodeAlg = ref<string>('HS256');
const headerText = ref<string>('');
const payloadText = ref<string>('');
const encodeSecret = ref<string>('');
const encodedToken = ref<string>('');
const encodeError = ref<string>('');
const generating = ref(false);
const copied = ref(false);

// 时间声明设置
const iatEnabled = ref<boolean>(true);
const nbfEnabled = ref<boolean>(false);
const expEnabled = ref<boolean>(true);
const claimOffset = ref<number>(2);
const claimUnit = ref<'minute' | 'hour' | 'day'>('hour');

const claimSeconds = computed(() => {
  const factor = { minute: 60, hour: 3600, day: 86400 }[claimUnit.value];
  return Math.max(0, claimOffset.value || 0) * factor;
});

const currentAlgDesc = computed(() => ALG_OPTIONS.find(a => a.value === encodeAlg.value)?.desc ?? '');

// 切换算法时同步头部内容
watch(encodeAlg, (alg) => {
  const h = safeJsonParse<Record<string, unknown>>(headerText.value) ?? {};
  headerText.value = prettyJson({ ...h, alg, typ: h.typ ?? 'JWT' });
}, { immediate: true });

// 初始载荷示例
if (!payloadText.value) {
  payloadText.value = prettyJson({ sub: '1234567890', name: 'John Doe' });
}

function randomSecret() {
  // 生成 256 位随机密钥，以 base64url 形式展示
  encodeSecret.value = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  popupTip('已生成随机密钥', 'success', 1500);
}

async function generate() {
  encodeError.value = '';
  encodedToken.value = '';
  const header = safeJsonParse<Record<string, unknown>>(headerText.value);
  const payload = safeJsonParse<Record<string, unknown>>(payloadText.value);
  if (!header) {
    encodeError.value = '头部不是合法的 JSON，请检查格式';
    return;
  }
  if (!payload) {
    encodeError.value = '载荷不是合法的 JSON，请检查格式';
    return;
  }
  const alg = (header.alg as string) ?? encodeAlg.value;
  if (alg !== encodeAlg.value) header.alg = encodeAlg.value;
  generating.value = true;
  try {
    const finalPayload = applyTimeClaims(payload, {
      iat: { enabled: iatEnabled.value },
      nbf: { enabled: nbfEnabled.value, seconds: claimSeconds.value },
      exp: { enabled: expEnabled.value, seconds: claimSeconds.value },
    });
    encodedToken.value = await buildJwt({
      header: header as any,
      payload: finalPayload,
      secret: encodeSecret.value,
    });
  } catch (e: any) {
    encodeError.value = e?.message ?? '生成失败';
  } finally {
    generating.value = false;
  }
}

let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  await copyText(text);
  copied.value = true;
  popupTip('已复制到剪贴板', 'success', 1500);
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copied.value = false), 1500);
};
</script>

<style lang="css" scoped>
</style>
