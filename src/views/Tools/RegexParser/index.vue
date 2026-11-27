<!-- 正则表达式解析工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">正则表达式解析</h1>
    <p class="text-sm opacity-70 text-center max-w-2xl w-full self-center">
      输入正则表达式与测试文本，实时解析每个片段的含义、高亮全部匹配结果并查看捕获分组。基于浏览器原生 JavaScript RegExp 引擎。
    </p>

    <!-- 表达式输入 -->
    <div ref="topRef" class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-3">
        <label class="input input-md w-full font-mono" :class="{ 'input-error': hasError }">
          <span class="opacity-40 shrink-0">/</span>
          <input
              v-model="pattern"
              class="grow font-mono"
              placeholder="输入正则表达式，如：(\w+)@(\w+)\.com"
              spellcheck="false"
              autocomplete="off"
          />
          <button v-if="pattern" class="btn btn-ghost btn-xs btn-circle shrink-0" title="清空" @click="pattern = ''">
            <Close class="size-4"/>
          </button>
          <span class="opacity-40 shrink-0">/{{ flags }}</span>
        </label>

        <!-- 标志开关 -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="text-xs opacity-60 shrink-0">标志</span>
          <button
              v-for="f in ALL_FLAGS" :key="f.code"
              class="btn btn-xs font-mono"
              :class="selectedFlags.includes(f.code) ? 'btn-primary' : 'btn-ghost border border-base-300 bg-base-100'"
              :title="f.desc"
              @click="toggleFlag(f.code)"
          >{{ f.code }}<span class="font-sans font-normal opacity-80 ml-1 hidden sm:inline">{{ f.label }}</span></button>
          <div class="ml-auto shrink-0">
            <CopyBtn :value="fullRegex" label="复制正则" title="复制为 /表达式/标志 形式" popup-toast="on"/>
          </div>
        </div>

        <!-- 示例快捷填入 -->
        <div class="flex flex-wrap gap-1.5">
          <button
              v-for="p in PRESETS" :key="p.label"
              class="btn btn-xs btn-outline h-auto min-h-7 py-1 px-2 font-normal border-base-300 bg-base-100"
              :class="pattern === p.pattern ? 'border-primary text-primary' : 'hover:border-primary'"
              :title="p.pattern"
              @click="applyPreset(p)"
          >{{ p.label }}</button>
        </div>
      </div>
    </div>

    <!-- 语法错误 -->
    <div v-if="hasError" class="alert alert-error text-sm py-2.5">
      <span class="font-mono break-all">{{ testResult.error }}</span>
    </div>

    <!-- 测试文本与高亮 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold opacity-60">测试文本</span>
          <button v-if="testText" class="btn btn-ghost btn-xs" @click="testText = ''">清空</button>
        </div>
        <textarea
            v-model="testText"
            class="textarea textarea-md w-full h-44 resize-y font-mono text-sm"
            placeholder="粘贴或输入要匹配的文本…"
            spellcheck="false"
        ></textarea>
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold opacity-60">匹配高亮</span>
          <span v-if="testText && testResult.ok" class="text-xs opacity-50">
            {{ matches.length }} 个匹配<span v-if="testResult.truncated">（仅显示前 {{ MAX_MATCHES }} 个）</span>
          </span>
        </div>
        <div class="card bg-base-200 shadow-sm grow overflow-hidden">
          <div class="p-3 h-44 overflow-auto font-mono text-sm whitespace-pre-wrap break-all leading-6">
            <template v-if="segments.length">
              <template v-for="(s, i) in segments" :key="i">
                <span v-if="s.empty" class="inline-block w-0.5 h-4 -mb-0.5 bg-warning align-middle"
                      :title="`零宽匹配 #${(s.index ?? 0) + 1}`"></span>
                <mark v-else-if="s.hit" class="bg-warning/40 text-base-content rounded-xs ring-1 ring-warning/60"
                      :title="`匹配 #${(s.index ?? 0) + 1}`">{{ s.text }}</mark>
                <span v-else>{{ s.text }}</span>
              </template>
            </template>
            <span v-else class="opacity-40">在左侧输入测试文本后，这里会高亮显示匹配内容。</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 匹配结果 -->
    <div v-if="testText && testResult.ok" class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-sm font-semibold opacity-60">匹配结果</h2>
          <span class="text-xs opacity-40">位置从 0 开始计数，区间为左闭右开</span>
        </div>
        <p v-if="!matches.length" class="text-sm opacity-60 py-2">没有找到匹配项。</p>
        <ol v-else class="flex flex-col gap-1">
          <li v-for="(m, i) in matches" :key="i"
              class="rounded-box border border-base-300 bg-base-100 px-3 py-2 flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="badge badge-sm badge-primary badge-soft font-mono shrink-0">#{{ i + 1 }}</span>
              <span class="text-xs opacity-50 font-mono shrink-0">{{ m.index }}–{{ m.index + m.text.length }}</span>
              <code class="text-sm break-all grow">{{ m.text || '（零宽匹配）' }}</code>
              <CopyBtn v-if="m.text" :value="m.text" title="复制该匹配内容" popup-toast="on"/>
            </div>
            <div v-if="m.groups.length || m.named.length" class="flex flex-wrap gap-1">
              <span v-for="g in m.groups" :key="'g' + g.index"
                    class="badge badge-xs badge-ghost font-mono max-w-full whitespace-normal break-all">
                组{{ g.index }} = {{ g.text === undefined ? '未参与匹配' : JSON.stringify(g.text ?? '') }}
              </span>
              <span v-for="g in m.named" :key="'n' + g.name"
                    class="badge badge-xs badge-secondary badge-soft font-mono max-w-full whitespace-normal break-all">
                &lt;{{ g.name }}&gt; = {{ g.text === undefined ? '未参与匹配' : JSON.stringify(g.text ?? '') }}
              </span>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <!-- 表达式解析 -->
    <div v-if="pattern" class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-semibold opacity-60">表达式解析</h2>
          <span class="badge badge-xs badge-ghost">{{ explain.tokens.length }} 个片段</span>
          <span v-if="captureCount" class="badge badge-xs badge-ghost">{{ captureCount }} 个捕获分组</span>
          <span class="text-xs opacity-40 ml-auto">按书写顺序逐片段解释</span>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th class="w-10">#</th>
              <th>片段</th>
              <th>类型</th>
              <th>含义</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(t, i) in explain.tokens" :key="i">
              <td class="text-xs opacity-40 tabular-nums">{{ i + 1 }}</td>
              <td class="whitespace-nowrap">
                <code class="text-primary" :style="{ paddingLeft: t.depth * 14 + 'px' }">{{ t.raw }}</code>
              </td>
              <td>
                <span class="badge badge-xs border-transparent" :class="kindClass(t.kind)">
                  {{ regexTokenKindLabel(t.kind) }}
                </span>
              </td>
              <td class="text-sm break-all">{{ t.desc }}</td>
            </tr>
            </tbody>
          </table>
        </div>
        <div v-if="explain.warnings.length" class="flex flex-col gap-1">
          <div v-for="(w, i) in explain.warnings" :key="i" class="text-xs flex items-start gap-1.5">
            <span class="text-warning shrink-0">⚠</span>
            <span class="opacity-80">{{ w }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空态提示 -->
    <div v-if="!pattern" class="text-center opacity-40 py-8 text-sm leading-relaxed">
      在上方输入或点击示例正则，即可逐片段解析含义并实时测试匹配。<br/>
      支持捕获分组、命名分组、字符集合、量词、断言、反向引用等全部 JavaScript 正则语法。
    </div>

    <!-- ==================== 语法速查 ==================== -->
    <div class="divider text-xs opacity-50 mt-2">语法速查</div>

    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">常用语法速查</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
          <div v-for="group in CHEATS" :key="group.name" class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold opacity-60">{{ group.name }}</h3>
            <div class="overflow-x-auto">
              <table class="table table-xs">
                <tbody>
                <tr v-for="c in group.items" :key="c.token">
                  <td class="font-mono text-primary whitespace-nowrap">{{ c.token }}</td>
                  <td class="opacity-80">{{ c.mean }}</td>
                  <td class="font-mono text-xs opacity-50 whitespace-nowrap hidden sm:table-cell">{{ c.example }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 匹配标志 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body p-4 sm:p-5 gap-3">
        <h2 class="text-lg font-semibold">匹配标志（Flags）</h2>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
            <tr class="text-xs opacity-60">
              <th>标志</th>
              <th>名称</th>
              <th>作用</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="f in ALL_FLAGS" :key="f.code">
              <td class="font-mono font-bold text-primary">{{ f.code }}</td>
              <td class="whitespace-nowrap">{{ f.label }}</td>
              <td class="text-sm opacity-80">{{ f.desc }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 注意事项 -->
    <div class="card bg-base-200 shadow-sm mb-4">
      <div class="card-body p-4 sm:p-5 gap-2">
        <h2 class="text-lg font-semibold">注意事项</h2>
        <ul class="text-sm opacity-80 leading-relaxed flex flex-col gap-1.5 list-disc pl-5">
          <li v-for="(n, i) in NOTES" :key="i">{{ n }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import CopyBtn from '@/components/CopyBtn';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { explainRegex, regexTokenKindLabel, testRegex, type RegexTokenKind } from './regexParser';

/** 最多展示的匹配数量 */
const MAX_MATCHES = 500;

const route = useRoute();
const pattern = ref<string>('');
const testText = ref<string>('');
const selectedFlags = ref<string[]>(['g']);
const topRef = ref<HTMLElement | null>(null);

/** 标志说明 */
const ALL_FLAGS = [
  { code: 'g', label: '全局', desc: '全局匹配：查找所有匹配项，而不是找到第一个就停止' },
  { code: 'i', label: '忽略大小写', desc: '忽略大小写：A 与 a 视为相同' },
  { code: 'm', label: '多行', desc: '多行模式：^ 和 $ 匹配每一行的开头与结尾' },
  { code: 's', label: '点匹配换行', desc: 'dotAll：让 . 也能匹配换行符' },
  { code: 'u', label: 'Unicode', desc: 'Unicode 模式：正确处理代理对，并启用 \\p{…}、\\u{…}' },
  { code: 'y', label: '粘性', desc: '粘性匹配：只从 lastIndex 位置开始匹配，不向后搜索' },
];

/** 按固定顺序拼接标志，避免出现顺序不稳定的展示结果 */
const flags = computed(() => ALL_FLAGS
    .filter(f => selectedFlags.value.includes(f.code))
    .map(f => f.code)
    .join(''));

/** 完整表达式（带首尾斜杠） */
const fullRegex = computed(() => `/${pattern.value}/${flags.value}`);

const explain = computed(() => explainRegex(pattern.value, flags.value));
const captureCount = computed(() => explain.value.groups.length);

const testResult = computed(() => testRegex(pattern.value, flags.value, testText.value, MAX_MATCHES));
const matches = computed(() => testResult.value.matches);
const hasError = computed(() => !!pattern.value && !testResult.value.ok);

/** 高亮片段 */
interface Segment {
  text: string;
  hit: boolean;
  index?: number;
  empty?: boolean;
}

const segments = computed<Segment[]>(() => {
  const text = testText.value;
  if (!text || !testResult.value.ok) return [];
  const result: Segment[] = [];
  let last = 0;
  testResult.value.matches.forEach((m, idx) => {
    if (m.index > last) result.push({ text: text.slice(last, m.index), hit: false });
    if (m.text) result.push({ text: m.text, hit: true, index: idx });
    else result.push({ text: '', hit: true, index: idx, empty: true });
    last = m.index + m.text.length;
  });
  if (last < text.length) result.push({ text: text.slice(last), hit: false });
  return result;
});

/** 片段类型对应的徽标样式（必须写全类名，供 Tailwind 扫描） */
const KIND_CLASS: Record<RegexTokenKind, string> = {
  literal: 'badge-ghost',
  dot: 'badge-info badge-soft',
  escape: 'badge-secondary badge-soft',
  'char-class': 'badge-success badge-soft',
  anchor: 'badge-warning badge-soft',
  quantifier: 'badge-primary badge-soft',
  alternation: 'badge-error badge-soft',
  'group-open': 'badge-accent badge-soft',
  'group-close': 'badge-accent badge-soft',
  flag: 'badge-neutral badge-soft',
};
const kindClass = (kind: RegexTokenKind): string => KIND_CLASS[kind];

/** 切换标志 */
const toggleFlag = (code: string) => {
  const idx = selectedFlags.value.indexOf(code);
  if (idx >= 0) selectedFlags.value.splice(idx, 1);
  else selectedFlags.value.push(code);
};

/** 示例 */
interface Preset {
  label: string;
  pattern: string;
  text: string;
  flags?: string[];
}

const PRESETS: Preset[] = [
  { label: '邮箱', pattern: '([\\w.-]+)@([\\w-]+\\.)+([A-Za-z]{2,})', text: '联系我们：alice@example.com 或 bob@test.org' },
  { label: '手机号', pattern: '1[3-9]\\d{9}', text: '13812345678、19900001111、12345678901' },
  { label: 'URL', pattern: 'https?://[^\\s]+', text: '访问 https://example.com/a?b=1 或 http://test.cn' },
  { label: '日期', pattern: '(\\d{4})-(\\d{2})-(\\d{2})', text: '2026-11-27 与 2025-01-01' },
  { label: '中文', pattern: '[\\u4e00-\\u9fa5]+', text: 'Hello 世界，正则表达式测试' },
  { label: 'HTML 标签', pattern: '<([a-z][a-z0-9]*)\\b[^>]*>', text: '<div class="a">内容</div>' },
  { label: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', text: '192.168.1.1 与 10.0.0.255' },
  { label: '命名分组', pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})', text: '日期 2026-11-27' },
];

/** 应用示例 */
const applyPreset = (p: Preset) => {
  pattern.value = p.pattern;
  testText.value = p.text;
  selectedFlags.value = p.flags ?? ['g'];
  topRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** 语法速查表 */
const CHEATS: { name: string; items: { token: string; mean: string; example: string }[] }[] = [
  {
    name: '字符类',
    items: [
      { token: '.', mean: '任意字符（s 标志时可匹配换行）', example: 'a.c' },
      { token: '\\d', mean: '数字 0-9', example: '\\d{3}' },
      { token: '\\D', mean: '非数字', example: '\\D+' },
      { token: '\\w', mean: '字母、数字或下划线', example: '\\w+' },
      { token: '\\W', mean: '非单词字符', example: '\\W+' },
      { token: '\\s', mean: '空白字符', example: '\\s+' },
      { token: '\\S', mean: '非空白字符', example: '\\S+' },
    ],
  },
  {
    name: '字符集合',
    items: [
      { token: '[abc]', mean: 'a、b、c 中的任意一个', example: '[aeiou]' },
      { token: '[^abc]', mean: '除 a、b、c 外的任意字符', example: '[^0-9]' },
      { token: '[a-z]', mean: 'a 到 z 的任意字符', example: '[a-zA-Z]' },
      { token: '[\\u4e00-\\u9fa5]', mean: '常用汉字', example: '[\\u4e00-\\u9fa5]+' },
    ],
  },
  {
    name: '量词',
    items: [
      { token: '*', mean: '重复 0 次或多次', example: '\\d*' },
      { token: '+', mean: '重复 1 次或多次', example: '\\d+' },
      { token: '?', mean: '出现 0 次或 1 次', example: 'colou?r' },
      { token: '{n}', mean: '恰好重复 n 次', example: '\\d{4}' },
      { token: '{n,}', mean: '至少重复 n 次', example: '\\d{2,}' },
      { token: '{n,m}', mean: '重复 n 到 m 次', example: '\\d{2,4}' },
      { token: '*?', mean: '懒惰：尽可能少匹配', example: '<.*?>' },
    ],
  },
  {
    name: '分组与引用',
    items: [
      { token: '( )', mean: '捕获分组，结果可被引用', example: '(\\w+)' },
      { token: '(?: )', mean: '非捕获分组，仅用于分组', example: '(?:ab)+' },
      { token: '(?<name> )', mean: '命名捕获分组', example: '(?<year>\\d{4})' },
      { token: '|', mean: '或：匹配左侧或右侧', example: 'cat|dog' },
      { token: '\\1', mean: '反向引用第 1 个捕获分组', example: '(\\w)\\1' },
      { token: '\\k<name>', mean: '反向引用命名分组', example: '(?<n>\\w)\\k<n>' },
    ],
  },
  {
    name: '断言与锚点',
    items: [
      { token: '^', mean: '字符串（或行）开头', example: '^\\d+' },
      { token: '$', mean: '字符串（或行）结尾', example: '\\d+$' },
      { token: '\\b', mean: '单词边界', example: '\\bword\\b' },
      { token: '\\B', mean: '非单词边界', example: '\\Bword' },
      { token: '(?= )', mean: '正向先行断言', example: '\\d(?=px)' },
      { token: '(?! )', mean: '负向先行断言', example: '\\d(?!px)' },
      { token: '(?<= )', mean: '正向后行断言', example: '(?<=\\$)\\d+' },
      { token: '(?<! )', mean: '负向后行断言', example: '(?<!\\$)\\d+' },
    ],
  },
  {
    name: '转义',
    items: [
      { token: '\\.', mean: '匹配点号字面量', example: 'a\\.b' },
      { token: '\\\\', mean: '匹配反斜杠', example: 'C:\\\\' },
      { token: '\\n', mean: '换行符', example: '\\n' },
      { token: '\\t', mean: '制表符', example: '\\t' },
      { token: '\\uXXXX', mean: 'Unicode 转义', example: '\\u4e2d' },
      { token: '\\xHH', mean: '十六进制转义', example: '\\x41' },
    ],
  },
];

/** 注意事项 */
const NOTES = [
  '“ . * + ? ( ) [ ] { } ^ $ | \\ ” 等字符具有特殊含义，要匹配字面量需用反斜杠转义，例如匹配点号写作 “\\. ”。',
  'JavaScript 不支持 PCRE 的占有量词（*+）、原子分组（(?>...)）、条件表达式等语法，本工具以浏览器原生引擎为准。',
  '量词后加 “?” 表示懒惰模式，例如 “.*?” 会尽可能少地匹配；默认则是贪婪模式，尽可能多地匹配。',
  '开启 g 或 y 标志时 RegExp 的 lastIndex 会在多次调用间保留，本工具每次测试都会重新创建实例，不会互相干扰。',
  '“\\u{…}” 与 “\\p{…}” 需要 u（或 v）标志才会生效；u 与 v 不能同时开启，本工具只提供 u。',
  '后行断言（Lookbehind：?<= 与 ?<!）在较旧的浏览器中可能不受支持，生产环境使用前请确认目标浏览器版本。',
];

onMounted(() => {
  // 支持 /tools/regex-parser?pattern=...&text=... 深链直达
  const p = route.query.pattern;
  if (typeof p === 'string' && p) pattern.value = p;
  const t = route.query.text;
  if (typeof t === 'string' && t) testText.value = t;
});
</script>
