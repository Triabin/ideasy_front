<!-- Cron 表达式解析工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">Cron 表达式解析</h1>
    <p class="text-sm opacity-70 text-center max-w-2xl w-full self-center">
      输入 Cron 表达式，即时获得逐字段中文解释与接下来的执行时间预览；页面下方附有 Cron 表达式介绍与语法速查手册。
    </p>

    <!-- 输入卡片 -->
    <div ref="topRef" class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-3">
        <label class="input input-md w-full font-mono" :class="{ 'input-error': hasError }">
          <span class="text-xs opacity-40 tracking-widest shrink-0">CRON</span>
          <input
              v-model="expr"
              class="grow font-mono"
              placeholder="输入 Cron 表达式，如：0 0 12 * * ?"
              spellcheck="false"
          />
          <button v-if="expr" class="btn btn-ghost btn-xs btn-circle shrink-0" title="清空" @click="expr = ''">
            <Close class="size-4"/>
          </button>
        </label>

        <!-- 星期约定切换（仅 6 位表达式存在歧义） -->
        <div v-if="showDialectSwitch" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span class="opacity-60 shrink-0">星期数字约定</span>
          <div class="join shrink-0">
            <button class="btn btn-xs join-item" :class="{ 'btn-primary': effectiveDialect === 'quartz' }"
                    @click="dialectPref = 'quartz'">Quartz/xxl-job（1=周日）
            </button>
            <button class="btn btn-xs join-item" :class="{ 'btn-primary': effectiveDialect === 'unix' }"
                    @click="dialectPref = 'unix'">标准/Spring（0=周日）
            </button>
          </div>
          <span class="opacity-40">6 位表达式的数字星期在两种平台含义相差一天，默认自动识别，不确定时可切换对照</span>
        </div>
        <div v-else-if="fieldCount === 7" class="text-xs opacity-50">
          7 位为 Quartz 格式（秒 分 时 日 月 周 年），星期按 1=周日 约定解析
        </div>

        <!-- 示例快捷填入 -->
        <div class="flex flex-wrap gap-1.5">
          <button
              v-for="p in PRESETS" :key="p.expr"
              class="btn btn-xs btn-outline h-auto min-h-7 py-1 px-2 font-mono font-normal border-base-300 bg-base-100"
              :class="expr.trim() === p.expr ? 'border-primary text-primary' : 'hover:border-primary'"
              :title="`填入：${p.label}`"
              @click="useExample(p)"
          >{{ p.expr }}<span class="font-sans opacity-50 ml-1 hidden sm:inline">{{ p.label }}</span></button>
        </div>
      </div>
    </div>

    <!-- 解析错误 -->
    <div v-if="hasError" class="alert alert-error text-sm py-2.5">
      <span>{{ result.error }}</span>
    </div>

    <!-- 整体含义 -->
    <div v-if="result.ok && expr.trim()" class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-2.5">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="badge badge-sm badge-primary badge-soft">{{ formatBadge }}</span>
          <span v-if="result.alias" class="badge badge-sm badge-ghost font-mono">{{ aliasBadge }}</span>
          <span v-if="result.hasSeconds" class="badge badge-sm badge-ghost">
            {{ result.dialect === 'quartz' ? '周：1=周日（Quartz）' : '周：0=周日（标准/Spring）' }}
          </span>
          <span class="badge badge-sm badge-ghost font-mono">时区 {{ tzText }}</span>
          <div class="ml-auto flex items-center shrink-0">
            <CopyBtn v-if="overallDesc" :value="overallDesc" label="复制描述" title="复制中文描述" popup-toast="on"/>
            <CopyBtn :value="expr.trim()" label="复制表达式" title="复制 Cron 表达式" popup-toast="on"/>
          </div>
        </div>
        <p class="text-base sm:text-lg font-medium leading-relaxed">{{ overallDesc }}</p>
        <div v-for="(w, i) in result.warnings" :key="i" class="text-xs flex items-start gap-1.5">
          <span class="text-warning shrink-0">⚠</span>
          <span class="opacity-80">{{ w }}</span>
        </div>
      </div>
    </div>

    <!-- 字段分解（出错时也展示，便于定位问题字段） -->
    <div v-if="result.fields.length" class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-3">
        <h2 class="text-sm font-semibold opacity-60">字段分解</h2>
        <div class="flex flex-wrap items-end gap-2">
          <div v-for="f in result.fields" :key="f.key" class="flex flex-col items-center gap-1">
            <span class="badge h-auto min-h-9 px-3 py-2 font-mono text-sm border-transparent" :class="f.cls">{{ f.raw }}</span>
            <span class="text-[11px] opacity-60">{{ f.label }}</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th>字段</th>
              <th>取值</th>
              <th>含义</th>
              <th>允许范围</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="f in result.fields" :key="f.key">
              <td><span class="badge badge-sm border-transparent" :class="f.cls">{{ f.label }}</span></td>
              <td class="font-mono whitespace-nowrap">{{ f.raw }}</td>
              <td :class="f.error ? 'text-error text-xs' : 'text-sm'">{{ f.error || f.desc }}</td>
              <td class="text-xs opacity-60 whitespace-nowrap">{{ f.range }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 下次执行时间 -->
    <div v-if="result.ok && !result.noFire" class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold opacity-60">接下来 {{ result.nextTimes.length }} 次执行时间</h2>
          <span class="text-xs opacity-40">基于浏览器本地时区（{{ tzText }}）推算，每 30 秒自动刷新</span>
        </div>
        <ol v-if="result.nextTimes.length" class="flex flex-col gap-px">
          <li v-for="(t, i) in result.nextTimes" :key="i"
              class="flex items-center gap-3 px-2 py-1.5 rounded-sm text-sm hover:bg-base-100 transition-colors">
            <span class="w-5 text-right text-xs opacity-40 tabular-nums shrink-0">{{ i + 1 }}</span>
            <span class="font-mono" :class="i === 0 ? 'text-primary font-medium' : ''">
              {{ t.format(result.hasSeconds ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd HH:mm') }}
            </span>
            <span class="text-xs opacity-60 shrink-0">{{ t.format('EEE') }}</span>
            <span class="badge badge-ghost badge-xs ml-auto shrink-0 font-normal">{{ relTime(t) }}</span>
          </li>
        </ol>
        <p v-else class="text-sm opacity-60 py-2">
          2100 年前找不到可执行的时间 —— 请检查是否存在“2 月 30 日”这类永不出现的组合，或年份字段是否已过期。
        </p>
        <p v-if="result.exhausted && result.nextTimes.length" class="text-xs opacity-40">2100 年前没有更晚的触发时间了</p>
      </div>
    </div>
    <div v-else-if="result.ok && result.noFire" class="alert alert-info alert-soft text-sm py-3">
      {{ result.description }}
    </div>

    <!-- 空态提示 -->
    <div v-if="!expr.trim()" class="text-center opacity-40 py-8 text-sm leading-relaxed">
      在上方输入或点击示例 Cron 表达式，即可实时解析含义。<br/>
      支持标准 Crontab（5 位）、Quartz/Spring（6/7 位）语法及 L、W、#、@daily 等特殊写法。
    </div>

    <!-- ==================== 介绍与速查手册 ==================== -->
    <div class="divider text-xs opacity-50 mt-2">Cron 表达式介绍与速查手册</div>

    <!-- 什么是 Cron 表达式 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">什么是 Cron 表达式？</h2>
        <p class="text-sm leading-relaxed opacity-80">
          Cron 表达式是一串用于描述「什么时候触发」的字符串，名字来源于希腊语 <i>chronos</i>（时间）。
          它把时间切分成<b>秒、分、时、日、月、周（年）</b>等字段，每个字段声明自己匹配哪些时刻；
          调度器每分钟（含秒字段时每秒）将当前时间与表达式比对一次，所有字段同时命中就执行对应任务。
        </p>
        <p class="text-sm leading-relaxed opacity-80">
          一行表达式就能精确表达「工作日上午 9 点半」「每隔 15 分钟」「每月最后一个周五」这类周期规则。
          自 1970 年代 Unix 的 <b>cron</b> 守护进程诞生以来，它已成为几乎所有语言与平台定时任务的事实标准。
        </p>
        <h3 class="text-sm font-semibold opacity-70 mt-1">典型用途</h3>
        <ul class="text-sm opacity-80 list-disc pl-5 flex flex-col gap-0.5">
          <li>定时备份数据库与日志、清理临时文件等服务器运维任务</li>
          <li>周期性生成并发送报表、提醒消息、营销推送</li>
          <li>轮询同步数据、健康检查、刷新缓存</li>
          <li>CI/CD 定时构建（如 GitHub Actions schedule）与各类云平台的定时触发器</li>
        </ul>
      </div>
    </div>

    <!-- 字段结构 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">字段结构</h2>
        <p class="text-sm opacity-80">
          标准 Crontab 为 <b>5 位</b>；Quartz / Spring 在最前面增加「秒」字段（<b>6 位</b>）；Quartz 还可在最后追加可选的「年」字段（<b>7 位</b>）。字段之间用空格分隔。
        </p>
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <span class="text-xs opacity-60">标准 Crontab（5 位）：<span class="font-mono">30 9 * * 1-5</span> → 工作日 9:30</span>
            <div class="flex flex-wrap gap-1.5">
              <div v-for="d in DIAGRAM_5" :key="d.label" class="flex flex-col items-center gap-0.5">
                <span class="badge badge-sm font-mono border-transparent" :class="d.cls">{{ d.val }}</span>
                <span class="text-[10px] opacity-50">{{ d.label }}</span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs opacity-60">Quartz / Spring（6-7 位）：<span class="font-mono">0 30 9 ? * MON-FRI 2027</span> → 2027 年工作日 9:30:00</span>
            <div class="flex flex-wrap gap-1.5">
              <div v-for="d in DIAGRAM_6" :key="d.label" class="flex flex-col items-center gap-0.5">
                <span class="badge badge-sm font-mono border-transparent" :class="d.cls">{{ d.val }}</span>
                <span class="text-[10px] opacity-50">{{ d.label }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-sm text-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th>字段</th>
              <th>允许范围</th>
              <th>特殊字符</th>
              <th>说明</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="f in FIELD_DOCS" :key="f.field">
              <td class="font-medium whitespace-nowrap">{{ f.field }}</td>
              <td class="font-mono text-xs whitespace-nowrap">{{ f.range }}</td>
              <td class="font-mono text-xs whitespace-nowrap">{{ f.chars }}</td>
              <td class="text-xs opacity-70">{{ f.note }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 特殊字符 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">特殊字符</h2>
        <div class="overflow-x-auto">
          <table class="table table-sm text-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th>字符</th>
              <th>含义</th>
              <th>示例</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="s in SPECIALS" :key="s.ch">
              <td class="font-mono font-bold text-primary text-base">{{ s.ch }}</td>
              <td class="text-xs sm:text-sm opacity-80">{{ s.mean }}</td>
              <td class="whitespace-nowrap">
                <span class="font-mono text-xs cursor-pointer hover:text-primary" title="点击填入上方输入框" @click="useExample({ expr: s.ex, dialect: s.dialect })">{{ s.ex }}</span>
                <span class="text-xs opacity-60 ml-2 hidden sm:inline">{{ s.exDesc }}</span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 预定义表达式 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">预定义别名（@ 表达式）</h2>
        <p class="text-sm opacity-80">标准 Crontab 支持用 <span class="font-mono text-xs">@别名</span> 代替常用表达式，可读性更好：</p>
        <div class="overflow-x-auto">
          <table class="table table-sm text-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th>别名</th>
              <th>等价表达式</th>
              <th>含义</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="a in ALIASES_DOC" :key="a.a">
              <td class="font-mono text-xs text-primary whitespace-nowrap cursor-pointer hover:underline" title="点击填入上方输入框" @click="useExample({ expr: a.a.split(' / ')[0] })">{{ a.a }}</td>
              <td class="font-mono text-xs whitespace-nowrap">{{ a.e }}</td>
              <td class="text-xs sm:text-sm opacity-80">{{ a.m }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 常见使用场景 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">常见使用场景</h2>
        <p class="text-sm opacity-80">不同平台的字段数量与约定略有差异，跨平台复用表达式前请先确认：</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <div v-for="s in SCENES" :key="s.name" class="rounded-box border border-base-300 bg-base-100 p-3 flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm">{{ s.name }}</span>
              <span class="badge badge-xs badge-ghost shrink-0">{{ s.fmt }}</span>
            </div>
            <p class="text-xs opacity-70 leading-relaxed">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 常用示例 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">常用示例 <span class="text-xs font-normal opacity-50 ml-1">点击行即可填入上方输入框</span></h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2">
          <div class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold opacity-60">标准 Crontab（5 位）</h3>
            <div class="overflow-x-auto">
              <table class="table table-xs">
                <tbody>
                <tr v-for="e in EXAMPLES_STD" :key="e.expr" class="cursor-pointer hover:bg-base-100" @click="useExample(e)">
                  <td class="font-mono text-primary whitespace-nowrap">{{ e.expr }}</td>
                  <td class="opacity-80">{{ e.desc }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold opacity-60">Quartz / Spring（6-7 位）</h3>
            <div class="overflow-x-auto">
              <table class="table table-xs">
                <tbody>
                <tr v-for="e in EXAMPLES_QUARTZ" :key="e.expr" class="cursor-pointer hover:bg-base-100" @click="useExample(e)">
                  <td class="font-mono text-primary whitespace-nowrap">{{ e.expr }}</td>
                  <td class="opacity-80">{{ e.desc }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 注意事项 -->
    <div class="card bg-base-200 shadow-sm mb-4">
      <div class="card-body p-4 sm:p-5 gap-2">
        <h2 class="text-lg font-semibold">注意事项（踩坑提示）</h2>
        <ul class="text-sm opacity-80 leading-relaxed flex flex-col gap-1.5 list-disc pl-5">
          <li v-for="(n, i) in NOTES" :key="i">{{ n }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import CopyBtn from '@/components/CopyBtn';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { parseCron, type CronDialect, type CronParseResult } from './cronUtils';

/** 空结果（未输入时占位） */
const EMPTY_RESULT: CronParseResult = {
  ok: false, input: '', dialect: 'unix', dialectForced: true, hasSeconds: false, hasYear: false,
  fields: [], warnings: [], nextTimes: [],
};

const route = useRoute();
const expr = ref<string>('');
const dialectPref = ref<CronDialect | 'auto'>('auto');
const topRef = ref<HTMLElement | null>(null);
/** 30 秒节拍：驱动下次执行时间与相对时间的自动刷新 */
const nowTick = ref<number>(Date.now());
let timer = 0;

const result = computed<CronParseResult>(() => {
  void nowTick.value;
  const v = expr.value.trim();
  if (!v) return EMPTY_RESULT;
  return parseCron(v, dialectPref.value, 10);
});

const hasError = computed(() => !!expr.value.trim() && !result.value.ok && !!result.value.error);
/** 输入内容的字段数（别名按 0 处理） */
const fieldCount = computed(() => {
  const t = expr.value.trim();
  if (!t || t.startsWith('@')) return 0;
  return t.split(/\s+/).length;
});
/** 仅 6 位表达式存在星期约定歧义，展示切换开关 */
const showDialectSwitch = computed(() => fieldCount.value === 6);
const effectiveDialect = computed<CronDialect>(() => result.value.dialect);

const formatBadge = computed(() => result.value.hasYear ? 'Quartz · 7 位' : result.value.hasSeconds ? '6 位 · 含秒' : '标准 · 5 位');
const aliasBadge = computed(() => result.value.alias
    ? result.value.alias.expanded ? `${result.value.alias.name} = ${result.value.alias.expanded}` : result.value.alias.name
    : '');
/** cronstrue 描述失败时用字段含义拼接兜底 */
const overallDesc = computed(() => {
  const r = result.value;
  if (!r.ok) return '';
  if (r.description) return r.description;
  return r.fields.map(f => `${f.label}：${f.desc}`).join('；');
});

/** 本地时区展示文案，如 UTC+08:00 */
const tzText = (() => {
  const z = new Date().format('Z');
  return `UTC${z.slice(0, 3)}:${z.slice(3)}`;
})();

/** 相对当前时间的间隔描述 */
const relTime = (t: Date): string => {
  void nowTick.value;
  const sec = Math.round((t.getTime() - Date.now()) / 1000);
  if (sec < 60) return `${Math.max(sec, 0)} 秒后`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} 分钟后`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} 小时 ${m % 60} 分后` : `${h} 小时后`;
  const d = Math.floor(h / 24);
  if (d < 31) return `${d} 天后`;
  const mo = Math.floor(d / 30.44);
  if (mo < 12) return `${mo} 个月后`;
  return `${Math.floor(mo / 12)} 年后`;
};

/** 点击示例：填入输入框并回到顶部 */
const useExample = (e: { expr: string; dialect?: CronDialect }) => {
  expr.value = e.expr;
  dialectPref.value = e.dialect ?? 'auto';
  topRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** 输入框上方的快捷示例 */
const PRESETS: { expr: string; label: string; dialect?: CronDialect }[] = [
  { expr: '* * * * *', label: '每分钟' },
  { expr: '*/5 * * * *', label: '每 5 分钟' },
  { expr: '0 9 * * 1-5', label: '工作日 9 点' },
  { expr: '0 0 1 * *', label: '每月 1 号' },
  { expr: '@daily', label: '每天零点' },
  { expr: '0 0 12 * * ?', label: '每天中午', dialect: 'quartz' },
  { expr: '0 0/30 8-18 ? * MON-FRI', label: '工作日 8-18 点每半小时', dialect: 'quartz' },
  { expr: '0 0 0 L * ?', label: '每月最后一天', dialect: 'quartz' },
  { expr: '0 0 0 ? * 6L', label: '每月最后一个周五', dialect: 'quartz' },
  { expr: '0 0 0 ? * MON#2', label: '每月第 2 个周一', dialect: 'quartz' },
];

/** 结构图数据（类名与解析结果字段徽标保持一致，必须写全类名） */
const DIAGRAM_5 = [
  { val: '30', label: '分', cls: 'badge-soft badge-primary' },
  { val: '9', label: '时', cls: 'badge-soft badge-secondary' },
  { val: '*', label: '日', cls: 'badge-soft badge-success' },
  { val: '*', label: '月', cls: 'badge-soft badge-warning' },
  { val: '1-5', label: '周', cls: 'badge-soft badge-error' },
];
const DIAGRAM_6 = [
  { val: '0', label: '秒', cls: 'badge-soft badge-info' },
  { val: '30', label: '分', cls: 'badge-soft badge-primary' },
  { val: '9', label: '时', cls: 'badge-soft badge-secondary' },
  { val: '?', label: '日', cls: 'badge-soft badge-success' },
  { val: '*', label: '月', cls: 'badge-soft badge-warning' },
  { val: 'MON-FRI', label: '周', cls: 'badge-soft badge-error' },
  { val: '2027', label: '年(可选)', cls: 'badge-soft badge-neutral' },
];

/** 字段说明表 */
const FIELD_DOCS = [
  { field: '秒', range: '0-59', chars: '* , - /', note: '仅 6/7 位格式（Quartz/Spring）有，标准 Crontab 没有秒字段' },
  { field: '分', range: '0-59', chars: '* , - /', note: '5 位格式的第 1 位，6/7 位格式的第 2 位' },
  { field: '时', range: '0-23', chars: '* , - /', note: '24 小时制' },
  { field: '日', range: '1-31', chars: '* , - / ? L W', note: 'L=每月最后一天，W=最近的工作日（L/W 为 Quartz 扩展）' },
  { field: '月', range: '1-12', chars: '* , - /', note: '也可用英文缩写 JAN-DEC' },
  { field: '周', range: '标准 0-7；Quartz 1-7', chars: '* , - / ? L #', note: '标准/Spring：0 与 7 均为周日；Quartz：1=周日；也可用 SUN-SAT' },
  { field: '年', range: '1970-2099', chars: '* , - /', note: '可选，仅 Quartz 7 位格式支持' },
];

/** 特殊字符表 */
const SPECIALS: { ch: string; mean: string; ex: string; exDesc: string; dialect?: CronDialect }[] = [
  { ch: '*', mean: '任意值', ex: '* * * * *', exDesc: '每分钟触发' },
  { ch: ',', mean: '列表，同时取多个值', ex: '0 8,12,18 * * *', exDesc: '每天 8 点、12 点、18 点' },
  { ch: '-', mean: '范围', ex: '0 9-17 * * *', exDesc: '9 点至 17 点整点' },
  { ch: '/', mean: '步长，每隔 n 个单位', ex: '*/10 * * * *', exDesc: '每 10 分钟' },
  { ch: '?', mean: '不指定。仅用于日/周字段，两者之一必须为 ?（Quartz）', ex: '0 0 12 ? * MON', exDesc: '每周一 12 点', dialect: 'quartz' },
  { ch: 'L', mean: '最后。日字段=每月最后一天；周字段 nL=每月最后一个周 n', ex: '0 0 0 L * ?', exDesc: '每月最后一天零点', dialect: 'quartz' },
  { ch: 'W', mean: '距离指定日最近的工作日；LW=每月最后一个工作日', ex: '0 0 0 15W * ?', exDesc: '每月最接近 15 号的工作日', dialect: 'quartz' },
  { ch: '#', mean: '每月第 n 个周几', ex: '0 0 0 ? * MON#2', exDesc: '每月第 2 个周一', dialect: 'quartz' },
];

/** 预定义别名表 */
const ALIASES_DOC = [
  { a: '@yearly / @annually', e: '0 0 1 1 *', m: '每年 1 月 1 日零点执行一次' },
  { a: '@monthly', e: '0 0 1 * *', m: '每月 1 日零点执行一次' },
  { a: '@weekly', e: '0 0 * * 0', m: '每周日零点执行一次' },
  { a: '@daily / @midnight', e: '0 0 * * *', m: '每天零点执行一次' },
  { a: '@hourly', e: '0 * * * *', m: '每小时整点执行一次' },
  { a: '@reboot', e: '—', m: '系统启动时运行一次（Crontab 特有，无固定触发时间）' },
];

/** 常见使用场景 */
const SCENES = [
  { name: 'Linux Crontab', fmt: '5 位', desc: '最经典的用法。crontab -e 编辑，用于日志切割、定时备份、脚本巡检等系统运维任务。' },
  { name: 'Spring @Scheduled', fmt: '6 位', desc: 'Java Spring 定时任务，第 1 位为秒；星期沿用 0-7 约定（0 与 7 均表示周日）。' },
  { name: 'Quartz / xxl-job', fmt: '6-7 位', desc: '企业级作业调度框架，支持秒、年字段与 L/W/# 扩展；星期为 1-7（1=周日）。' },
  { name: 'Kubernetes CronJob', fmt: '5 位', desc: '在 K8s 集群内周期创建并运行 Job，标准语法；时区默认跟随集群（通常为 UTC）。' },
  { name: 'GitHub Actions', fmt: '5 位', desc: 'schedule 触发的定时工作流，使用 UTC 时间；官方建议间隔不小于 15 分钟，高峰期可能延迟。' },
  { name: '云函数定时触发器', fmt: '不一', desc: '腾讯云 SCF、阿里云 FC、AWS EventBridge Scheduler 等，多兼容标准或 Quartz 语法。' },
  { name: '应用内嵌调度库', fmt: '不一', desc: 'node-cron（Node.js）、robfig/cron（Go）、APScheduler（Python）等，字段数与扩展支持各不相同。' },
];

/** 常用示例（标准 5 位） */
const EXAMPLES_STD: { expr: string; desc: string; dialect?: CronDialect }[] = [
  { expr: '* * * * *', desc: '每分钟触发' },
  { expr: '*/5 * * * *', desc: '每 5 分钟触发' },
  { expr: '0 * * * *', desc: '每小时整点触发' },
  { expr: '0 */2 * * *', desc: '每 2 小时整点触发' },
  { expr: '0 8-18 * * *', desc: '8 点至 18 点每小时整点触发' },
  { expr: '0 6,18 * * *', desc: '每天 6:00 与 18:00 触发' },
  { expr: '30 9 * * *', desc: '每天 9:30 触发' },
  { expr: '59 23 * * 1-5', desc: '工作日（周一至周五）23:59 触发' },
  { expr: '0 0 * * 0', desc: '每周日零点触发' },
  { expr: '0 0 1 * *', desc: '每月 1 号零点触发' },
  { expr: '30 4 1,15 * *', desc: '每月 1 号与 15 号 4:30 触发' },
  { expr: '0 0 1 */2 *', desc: '每隔 2 个月的 1 号零点触发' },
  { expr: '0 0 1 1 *', desc: '每年 1 月 1 日零点触发' },
  { expr: '0 0 29 2 *', desc: '仅闰年 2 月 29 日零点触发（约 4 年一次）' },
];

/** 常用示例（Quartz / Spring 6-7 位） */
const EXAMPLES_QUARTZ: { expr: string; desc: string; dialect?: CronDialect }[] = [
  { expr: '0 0 12 * * ?', desc: '每天 12:00 触发', dialect: 'quartz' },
  { expr: '0 0/15 * * * ?', desc: '每 15 分钟触发（从第 0 分开始）', dialect: 'quartz' },
  { expr: '0 30 9 ? * MON-FRI', desc: '工作日 9:30 触发', dialect: 'quartz' },
  { expr: '0 0 0 1 * ?', desc: '每月 1 号零点触发', dialect: 'quartz' },
  { expr: '0 0 0 L * ?', desc: '每月最后一天零点触发', dialect: 'quartz' },
  { expr: '0 0 0 L-3 * ?', desc: '每月最后一天前 3 天零点触发', dialect: 'quartz' },
  { expr: '0 0 0 LW * ?', desc: '每月最后一个工作日零点触发', dialect: 'quartz' },
  { expr: '0 0 0 15W * ?', desc: '每月最接近 15 号的工作日零点触发', dialect: 'quartz' },
  { expr: '0 0 0 ? * 6L', desc: '每月最后一个周五零点触发（Quartz 6=周五）', dialect: 'quartz' },
  { expr: '0 0 0 ? * MON#2', desc: '每月第 2 个周一零点触发', dialect: 'quartz' },
  { expr: '0 0 9-18 ? * 2-6', desc: '周一至周五 9-18 点整点触发（Quartz 2=周一、6=周五）', dialect: 'quartz' },
  { expr: '0 0 0 ? * * 2027', desc: '2027 年每天零点触发（7 位含年份）', dialect: 'quartz' },
];

/** 注意事项 */
const NOTES = [
  '星期数字有两种约定：标准 Crontab 与 Spring 为 0-7（0 和 7 都是周日），Quartz / xxl-job 为 1-7（1=周日、7=周六）。同一个 6 位表达式在不同平台可能相差一天，这是 Cron 最常见的坑，上线前务必核对。',
  '时区：Cron 按调度器所在服务器的本地时区解释。GitHub Actions 使用 UTC（北京时间需自行减 8 小时）；K8s CronJob 可用 timeZone 字段显式指定；各云厂商规则不一。',
  '「日」与「周」同时限定时：标准 Crontab 按满足其一即触发（OR）；Quartz 要求其中一个字段为 ?，两者都限定时本工具按同时满足（AND）解释并给出警告。',
  '不存在的日期永不触发：「2 月 30 日」这类组合不会有任何执行时间；「31 号」在没有 31 日的月份会自动跳过。',
  'L、W、# 属于 Quartz 扩展字符，传统 Linux Crontab（Vixie Cron）不支持，写入系统 crontab 前请先确认所用实现的版本。',
  '标准 Crontab 最小调度粒度为 1 分钟；秒级调度需要 Quartz/Spring 的 6 位格式，且不建议在生产环境用高频秒级轮询代替业务自身的定时框架。',
];

onMounted(() => {
  // 支持 /tools/cron-parser?expr=... 深链直达
  const q = route.query.expr;
  if (typeof q === 'string' && q.trim()) expr.value = q.trim();
  timer = window.setInterval(() => (nowTick.value = Date.now()), 30000);
});
onBeforeUnmount(() => window.clearInterval(timer));
</script>
