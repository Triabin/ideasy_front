<!-- 八字排盘工具路由页面 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto">
    <h1 class="w-full text-center text-3xl mt-2">八字排盘</h1>
    <p class="text-sm opacity-70 text-center">以出生年月日时排四柱干支，观五行十神、格局用神与大运流年，顺带了解这套流传千年的命理文化。</p>

    <!-- 输入 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <label class="join">
            <span class="label mr-2">出生时间</span>
            <input type="datetime-local" class="input input-sm join-item w-52 font-mono" v-model="birthStr" min="1900-01-01T00:00" max="2099-12-31T23:59"/>
          </label>
          <label class="join">
            <span class="label mr-2">出生地</span>
            <select class="select select-sm join-item w-24" v-model.number="provIdx" title="省 / 直辖市 / 特别行政区">
              <option v-for="(p, i) in PROVINCES" :key="p.n" :value="i">{{ p.n }}</option>
            </select>
            <select class="select select-sm join-item w-28" v-model.number="cityIdx" title="地级市 / 地区 / 自治州">
              <option v-for="(c, i) in province.cities" :key="c.n" :value="i">{{ c.n }}</option>
            </select>
            <select v-if="city.areas.length" class="select select-sm join-item w-28" v-model.number="areaIdx" title="县 / 区 / 县级市">
              <option v-for="(a, i) in city.areas" :key="a.n" :value="i">{{ a.n }}</option>
            </select>
          </label>
          <div class="btn-group">
            <button class="btn btn-sm" :class="{ 'btn-primary': isMale }" @click="isMale = true">男</button>
            <button class="btn btn-sm" :class="{ 'btn-primary': !isMale }" @click="isMale = false">女</button>
          </div>
          <label class="join cursor-pointer">
            <span class="label mr-2" title="经度校正 + 时差方程，还原太阳真正当顶的时刻">真太阳时</span>
            <input type="checkbox" class="toggle toggle-sm join-item" v-model="useTrueSolar"/>
          </label>
          <label class="join ml-auto">
            <span class="label mr-2" title="23:00-24:00 的晚子时归当日还是次日，命理上存在分歧">晚子时</span>
            <select class="select select-sm join-item w-36" v-model="zishiRule">
              <option value="sameDay">子正换日（推荐）</option>
              <option value="nextDay">子初换日</option>
              <option value="legacyCompat">兼容常见排盘</option>
            </select>
          </label>
          <button class="btn btn-sm btn-primary shrink-0" @click="useNow">用当前时间</button>
        </div>
        <p class="text-xs opacity-60">
          输入时间按出生地当地墙上时间解读；年柱以立春为界、月柱以节气为界。{{ ZISHI_RULE_NOTE[zishiRule] }}
          <template v-if="useTrueSolar">真太阳时按出生地政府驻地经度（当前 {{ birthPlace.lon }}°）校正，县级精度约 0.01°。</template>
        </p>
      </div>
    </div>

    <div v-if="view === null" class="alert alert-warning text-sm">出生时间不合法或超出支持范围（约 1900 - 2100 年），请调整后再试。</div>

    <template v-else>
      <!-- 四柱盘 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="card-title text-base">四柱八字</h2>
            <span class="badge badge-outline font-mono">{{ solarEcho }}</span>
            <span v-if="view.trueSolarMinutes !== null" class="badge badge-outline font-mono" title="经度校正 + 时差方程">
              真太阳时 {{ trueSolarEcho }}（{{ view.trueSolarMinutes >= 0 ? '+' : '' }}{{ view.trueSolarMinutes }} 分钟）
            </span>
            <span class="badge badge-outline">{{ lunarEcho }}</span>
            <span class="badge badge-outline">属{{ ZHI_ANIMAL[view.bazi.yearPillar.diZhi] }}</span>
            <button class="btn btn-sm btn-ghost ml-auto gap-1" title="点击复制排盘结果" @click="copyChart">
              <Copied v-if="copied" :size="16" :twClasses="['fill-success']"/>
              <Copy v-else :size="16"/>
              复制
            </button>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <div
                v-for="col in pillarCols"
                :key="col.label"
                class="rounded-xl border border-base-300 bg-base-100 px-1 py-3 flex flex-col items-center gap-1.5 min-w-0"
            >
              <div class="text-xs opacity-60">{{ col.label }}</div>
              <span class="badge badge-sm" :class="col.isDay ? 'badge-primary' : 'badge-ghost'">{{ col.tenGod }}</span>
              <div class="flex gap-1 text-3xl font-serif font-bold leading-none">
                <span :style="{ color: WUXING_COLOR[ganWuxing(col.pillar.tianGan)] }">{{ GAN_ZH[col.pillar.tianGan] }}</span>
                <span :style="{ color: WUXING_COLOR[zhiWuxing(col.pillar.diZhi)] }">{{ ZHI_ZH[col.pillar.diZhi] }}</span>
              </div>
              <div class="text-[11px] opacity-70">{{ WUXING_ZH[ganWuxing(col.pillar.tianGan)] }}{{ WUXING_ZH[zhiWuxing(col.pillar.diZhi)] }}</div>
              <div class="text-[11px] opacity-60">{{ nayinOf(col.pillar) }}</div>
              <div class="w-full border-t border-base-300 pt-1.5 px-2 flex flex-col gap-0.5">
                <div v-for="h in HIDDEN_STEMS[col.pillar.diZhi]" :key="h.gan" class="flex items-center justify-between text-[11px]">
                  <span :style="{ color: WUXING_COLOR[ganWuxing(h.gan)] }">{{ GAN_ZH[h.gan] }}</span>
                  <span class="opacity-70">{{ SHISHEN_ZH[shiShenOf(dayMaster(view.bazi), h.gan)] }}</span>
                </div>
              </div>
            </div>
          </div>
          <p class="text-xs opacity-60">
            日主（日干）<b>{{ GAN_ZH[dayMaster(view.bazi)] }}</b>，属{{ WUXING_ZH[ganWuxing(dayMaster(view.bazi))] }}、{{ ganIsYang(dayMaster(view.bazi)) ? '阳' : '阴' }}；
            地支下所列为其藏干（本气在前）及相对日主的十神。
          </p>
        </div>
      </div>

      <!-- 五行与十神 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body gap-3">
            <h2 class="card-title text-base">五行力量</h2>
            <div class="flex flex-col gap-2">
              <div v-for="row in wuxingRows" :key="row.wx" class="flex items-center gap-2 text-sm">
                <span class="w-6 text-center font-serif font-bold" :style="{ color: WUXING_COLOR[row.wx] }">{{ WUXING_ZH[row.wx] }}</span>
                <div class="grow h-2.5 rounded-full bg-base-300 overflow-hidden">
                  <div class="h-full rounded-full" :style="{ width: row.pct + '%', background: WUXING_COLOR[row.wx] }"></div>
                </div>
                <span class="w-14 text-right font-mono text-xs opacity-70">{{ row.score.toFixed(1) }}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="opacity-60">日主强弱：</span>
              <span class="badge badge-lg" :class="view.strength.isStrong ? 'badge-success' : 'badge-warning'">
                {{ STRENGTH_LEVEL_LABEL[view.strength.level] }}
              </span>
              <span v-for="d in deChips" :key="d.label" class="badge badge-sm" :class="d.ok ? 'badge-success' : 'badge-ghost'">
                {{ d.ok ? '✓' : '✗' }} {{ d.label }}
              </span>
            </div>
            <p class="text-xs opacity-70 leading-5">{{ view.strength.description }}</p>
          </div>
        </div>
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body gap-3">
            <h2 class="card-title text-base">十神分布</h2>
            <div class="flex flex-col gap-2">
              <div v-for="row in shiShenRows" :key="row.code" class="flex items-center gap-2 text-sm">
                <span class="w-10 shrink-0">{{ SHISHEN_ZH[row.code] }}</span>
                <div class="grow h-2.5 rounded-full bg-base-300 overflow-hidden">
                  <div class="h-full rounded-full bg-primary/70" :style="{ width: row.pct + '%' }"></div>
                </div>
                <span class="w-14 text-right font-mono text-xs opacity-70">{{ row.score.toFixed(2) }}</span>
              </div>
            </div>
            <p class="text-xs opacity-70 leading-5">
              天干按 1 计、地支藏干按本气/中气/余气权重折算；十神是日主与其余干支生克关系的代称，详见页末介绍。
            </p>
          </div>
        </div>
      </div>

      <!-- 格局与用神 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="card-title text-base">格局与用神</h2>
            <span class="badge badge-lg badge-primary">{{ patternLabel(view.pattern.pattern) }}</span>
            <span class="badge badge-outline">{{ formationStateLabel(view.pattern.formationState) }}</span>
            <span v-for="tag in view.pattern.secondaryTags ?? []" :key="tag" class="badge badge-sm badge-secondary">{{ tag }}</span>
          </div>
          <p class="text-sm opacity-80 leading-6">{{ view.pattern.description }}</p>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span v-for="god in yongShenChips" :key="god.label" class="badge badge-lg gap-1" :style="{ background: WUXING_COLOR[god.wx], color: '#fff', borderColor: WUXING_COLOR[god.wx] }">
              {{ god.label }}{{ WUXING_ZH[god.wx] }}
            </span>
            <span class="text-xs opacity-60">取法：{{ view.yongShen.method }}</span>
          </div>
          <p class="text-xs opacity-70 leading-5">病：{{ view.yongShen.disease }}　药：{{ view.yongShen.medicine }}</p>
          <p class="text-xs opacity-70 leading-5">{{ view.yongShen.reasoning }}</p>
        </div>
      </div>

      <!-- 大运流年 -->
      <div class="card bg-base-200 shadow-sm">
        <div class="card-body gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="card-title text-base">大运与流年</h2>
            <span class="badge badge-outline">{{ view.daYun?.forward ? '顺行' : '逆行' }}（{{ view.daYun?.forward ? '阳男阴女' : '阴男阳女' }}）</span>
            <span v-if="view.daYun" class="badge badge-outline font-mono">起运：{{ qiYunEcho }}（{{ view.daYun.startAgeText }}）</span>
          </div>
          <!-- pt-2.5 为「当前」徽标留出空间，避免被横向滚动容器裁切 -->
          <div v-if="view.daYun" class="flex gap-2 overflow-x-auto pt-2.5 pb-1">
            <button
                v-for="(item, i) in view.daYun.items"
                :key="item.index"
                class="relative shrink-0 flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 min-w-20 cursor-pointer transition-colors"
                :class="i === activeDaYun ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100 hover:border-primary/60'"
                @click="daYunSel = i"
            >
              <span v-if="i === currentDaYunIndex" class="badge badge-xs badge-primary absolute -top-2">当前</span>
              <span class="text-lg font-serif font-bold leading-none">
                <span :style="{ color: WUXING_COLOR[ganWuxing(item.pillar.tianGan)] }">{{ GAN_ZH[item.pillar.tianGan] }}</span>
                <span :style="{ color: WUXING_COLOR[zhiWuxing(item.pillar.diZhi)] }">{{ ZHI_ZH[item.pillar.diZhi] }}</span>
              </span>
              <span class="text-[11px] font-mono opacity-70">{{ item.startAge }}岁 · {{ item.startYear }}</span>
            </button>
          </div>
          <div v-if="activeDaYunItem" class="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            <div
                v-for="ln in liuNianRows"
                :key="ln.year"
                class="rounded-lg border px-1 py-1.5 flex flex-col items-center gap-0.5"
                :class="ln.year === nowYear ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100'"
            >
              <span class="text-[10px] font-mono opacity-60">{{ ln.year }}</span>
              <span class="text-base font-serif font-bold leading-none">
                <span :style="{ color: WUXING_COLOR[ganWuxing(ln.pillar.tianGan)] }">{{ GAN_ZH[ln.pillar.tianGan] }}</span>
                <span :style="{ color: WUXING_COLOR[zhiWuxing(ln.pillar.diZhi)] }">{{ ZHI_ZH[ln.pillar.diZhi] }}</span>
              </span>
              <span class="text-[10px] opacity-60">{{ ln.nominalAge }}岁</span>
            </div>
          </div>
          <p class="text-xs opacity-60">大运十年一换，自月柱顺/逆排；流年为当年干支。点击大运查看其内十个流年，高亮为当前所在。</p>
        </div>
      </div>
    </template>

    <!-- 传统文化 -->
    <div class="collapse collapse-arrow bg-base-100 border border-base-300">
      <input type="radio" name="traditional-accordion"/>
      <div class="collapse-title font-semibold">什么是八字：四柱与干支历</div>
      <div class="collapse-content text-sm">
        <p>八字又称四柱推命：把人出生的年、月、日、时各配一对干支，四组共八个字，故称「八字」。干支历以十天干（甲乙丙丁戊己庚辛壬癸）配十二地支（子丑寅卯辰巳午未申酉戌亥），阳干配阳支、阴干配阴支，循环得六十甲子，年、月、日、时各居其一。</p>
        <p>四柱的交界并不等于农历初一或公历元旦：年柱以立春为界（立春前仍算上一年），月柱以十二个「节」（立春、惊蛰、清明……小寒）为界，日柱以子时为界，时柱则按十二时辰每两小时一换。因此八字排盘本质是一部精确的节气历法，这也是本工具依赖节气表计算的原因。</p>
        <p>这套术数萌芽于唐（李虚中重年命），定型于宋（徐子平改以日干为主，后世称「子平法」），《渊海子平》《三命通会》《滴天髓》《子平真诠》等书层层累积，是传统社会里一套庞大的象征解释系统。</p>
      </div>
    </div>
    <div class="collapse collapse-arrow bg-base-100 border border-base-300">
      <input type="radio" name="traditional-accordion"/>
      <div class="collapse-title font-semibold">五行、藏干与十神</div>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>干支各配五行：甲乙木、丙丁火、戊己土、庚辛金、壬癸水；寅卯木、巳午火、申酉金、亥子水、辰戌丑未土。五行之间有生（木生火、火生土……）有克（木克土、土克水……），生克加上阴阳异同，就推出「十神」。</p>
        <p>十神以日干为「我」：与我同类为比肩、劫财（同辈、兄弟）；我生者为食神、伤官（才华、输出）；我克者为正财、偏财（财富、所支配）；克我者为正官、七杀（管束、功名）；生我者为正印、偏印（学识、庇佑）。传统命理据此把六亲、事业、财帛等都映射到一盘干支上。</p>
        <p>地支还「藏」天干：如寅藏甲丙戊、丑藏己癸辛，分本气、中气、余气，代表一支之中五行之气的深浅主次。排盘中每柱地支下所列即其藏干与对应十神。</p>
      </div>
    </div>
    <div class="collapse collapse-arrow bg-base-100 border border-base-300">
      <input type="radio" name="traditional-accordion"/>
      <div class="collapse-title font-semibold">身强弱、格局与用神</div>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>看命先看点：日主在局中是强是弱。传统以「得令」（月支是否当令生扶）、「得地」（地支是否有根）、「得势」（天干是否得助）三要素衡量，强弱决定喜忌的大方向。</p>
        <p>格局多从月令取：月支所藏透于天干者定格，如正官格、食神格；月令无比劫财官等可取时另有建禄、月刃诸格，还有从财、从杀、化气等特别格局。格局成破（有无冲克救应）与用神取舍是各流派分歧最大之处——本工具采用 zhiji-bazi 引擎的算法口径，只能代表一家之言。</p>
        <p>用神即「药」：命局之病（过旺、过弱、寒暖燥湿失衡）用什么五行来治。喜神助用、忌神致病、仇神助忌，传统上据此给出方位、颜色、行运宜忌等建议。</p>
      </div>
    </div>
    <div class="collapse collapse-arrow bg-base-100 border border-base-300">
      <input type="radio" name="traditional-accordion"/>
      <div class="collapse-title font-semibold">大运、流年与起运</div>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>命为车，运为路：八字是「命」，大运流年是「运」。大运十年一步，自月柱出发，阳年男命、阴年女命顺排，阴年男命、阳年女命逆排；流年则是一年一换的当年干支，与大运、原局相互作用是传统断事的舞台。</p>
        <p>起运岁数按出生日到最近一个「节」的天数折算：三天折一年、一天折四个月、一个时辰折十天。顺行者数到未来之节，逆行者数到过去之节，故同一天出生的人因性别不同，起运早晚与运序方向都可能不同。</p>
      </div>
    </div>
    <div class="collapse collapse-arrow bg-base-100 border border-base-300">
      <input type="radio" name="traditional-accordion"/>
      <div class="collapse-title font-semibold">真太阳时与晚子时之争</div>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>古人没有统一钟表，用的就是当地「真太阳时」——太阳当顶即正午。现代法定时间一个时区共用一条标准子午线，还叠加了时差方程之外的人为规定；排盘讲究些的，会把钟表时间还原成真太阳时：先按出生地经度与标准子午线之差校正，再加时差方程（地球轨道为椭圆、地轴有倾角，真太阳日全年并不等长，最大可差约十六分钟）。</p>
        <p>时柱以两小时为界，校正量足以让边界附近的命盘换柱，这正是本工具提供真太阳时开关的原因。</p>
        <p>另一处真实存在的分歧是晚子时：23:00 至 24:00 这一个时辰，日柱算当日还是次日？「子正换日」以午夜为日界，「子初换日」以 23 点为日界，两派各有传承；另有常见排盘软件日柱不进位而时干进位的兼容口径。本工具默认子正换日，并允许切换对照。</p>
      </div>
    </div>
    <div class="collapse collapse-arrow bg-base-100 border border-base-300">
      <input type="radio" name="traditional-accordion" checked/>
      <div class="collapse-title font-semibold">理性看待</div>
      <div class="collapse-content text-sm text-base-content/75 leading-6 indent-8">
        <p>八字命理是古人以历法与五行生克构建的象征系统，承载着传统社会的宇宙观与人生想象，是了解传统文化的一扇窗；但它并没有现代科学意义上的预测效力，身强弱、格局、用神更是流派林立、各执一说。</p>
        <p>请以文化研究与娱乐的心态使用本工具：把「用神」当作一种古典的性格与处境隐喻，而不是决策依据。命运的解释权，始终在你自己手里。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { copyText, popupToast } from '@/common/utils.ts';
import {
  STRENGTH_LEVEL_LABEL,
  computeChart,
  correctToTrueSolarTime,
  dateFromLocalTZ,
  dayMaster,
  elementScores,
  formationStateLabel,
  localComponents,
  lunarComponents,
  monthName,
  patternLabel,
  type LunarComponents,
  type PatternResult,
  type ShiShen,
  type StrengthResult,
  type YongShenResult,
  type ZishiRule,
  type BaZi as BaZiModel,
} from 'zhiji-bazi';
import {
  GAN_ZH,
  HIDDEN_STEMS,
  SHISHEN_ZH,
  WUXING_COLOR,
  WUXING_LIST,
  WUXING_ZH,
  ZHI_ANIMAL,
  ZHI_ZH,
  buildDaYun,
  ganIsYang,
  ganWuxing,
  liuNianOf,
  lunarDayName,
  nayinOf,
  pillarChinese,
  shiShenOf,
  zhiWuxing,
  type DaYunInfo,
  type DaYunItem,
} from './baziExtra';
import { PROVINCES } from './chinaRegions';

/** 页面视图模型：排盘成功或失败 */
interface ChartView {
  bazi: BaZiModel;
  strength: StrengthResult;
  pattern: PatternResult;
  yongShen: YongShenResult;
  date: Date;
  trueSolarMinutes: number | null;
  daYun: DaYunInfo | null;
  lunar: LunarComponents;
  place: BirthPlace;
}

/** 解析后的出生地：展示名、政府驻地经度（真太阳时）、时区（解读输入） */
interface BirthPlace {
  name: string;
  lon: number;
  zone: string;
  off: number;
}

const ZISHI_RULE_NOTE: Record<ZishiRule, string> = {
  sameDay: '晚子时（23:00-24:00）日柱仍算当日、时干用当日日干推。',
  nextDay: '晚子时（23:00-24:00）日柱进位为次日、时干用次日日干推。',
  legacyCompat: '晚子时日柱不进位、时干进位（部分流行排盘软件的口径，仅供对照）。',
};

/* ------------------------- 输入状态 ------------------------- */
const pad = (n: number) => String(n).padStart(2, '0');
const nowLocalStr = (zone: string) => {
  const c = localComponents(new Date(), zone);
  return `${c.year}-${pad(c.month)}-${pad(c.day)}T${pad(c.hour)}:${pad(c.minute)}`;
};
/** 当前时刻往前推 years 年的墙上时间字符串（2 月 29 日等不存在日期回退到当月末） */
const yearsAgoStr = (zone: string, years: number) => {
  const c = localComponents(new Date(), zone);
  const d = new Date(c.year - years, c.month - 1, c.day);
  if (d.getMonth() !== c.month - 1) d.setDate(0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(c.hour)}:${pad(c.minute)}`;
};

/* ------------------------- 出生地三级联动 ------------------------- */
const provIdx = ref(0);
const cityIdx = ref(0);
const areaIdx = ref(0);
watch(provIdx, () => {
  cityIdx.value = 0;
  areaIdx.value = 0;
});
watch(cityIdx, () => {
  areaIdx.value = 0;
});

const province = computed(() => PROVINCES[provIdx.value]);
const city = computed(() => province.value.cities[Math.min(cityIdx.value, province.value.cities.length - 1)]);
const area = computed(() => city.value.areas[Math.min(areaIdx.value, city.value.areas.length - 1)] ?? null);
const birthPlace = computed<BirthPlace>(() => ({
  name: `${province.value.n}${city.value.n}${area.value ? area.value.n : ''}`,
  lon: area.value?.lon ?? city.value.lon,
  zone: city.value.zone ?? province.value.zone,
  off: city.value.off ?? province.value.off,
}));

/* ------------------------- 其他输入 ------------------------- */
const isMale = ref(true);
const useTrueSolar = ref(false);
const zishiRule = ref<ZishiRule>('sameDay');
/** 默认出生时间：到今天刚好满 18 周岁 */
const birthStr = ref(yearsAgoStr(PROVINCES[0].zone, 18));

const useNow = () => {
  birthStr.value = nowLocalStr(birthPlace.value.zone);
};

/* ------------------------- 排盘 ------------------------- */
const view = computed<ChartView | null>(() => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(birthStr.value);
  if (!m) return null;
  const comps = { year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], second: 0 };
  if (comps.year < 1900 || comps.year > 2099) return null;
  const place = birthPlace.value;
  try {
    let date = dateFromLocalTZ(comps, place.zone);
    let trueSolarMinutes: number | null = null;
    if (useTrueSolar.value) {
      const corrected = correctToTrueSolarTime({ date, longitude: place.lon, tzOffsetMinutesStandard: place.off });
      trueSolarMinutes = Math.round((corrected.getTime() - date.getTime()) / 60000);
      date = corrected;
    }
    const result = computeChart({
      birthDate: date,
      timeZone: place.zone,
      zishiRule: zishiRule.value,
      isMale: isMale.value,
      birthCity: place.name,
    });
    return {
      bazi: result.bazi,
      strength: result.strength,
      pattern: result.pattern,
      yongShen: result.yongShen,
      date,
      trueSolarMinutes,
      daYun: buildDaYun(date, result.bazi, place.zone, isMale.value),
      lunar: lunarComponents(date, place.zone),
      place,
    };
  } catch {
    return null;
  }
});

/* ------------------------- 四柱展示 ------------------------- */
const pillarCols = computed(() => {
  const v = view.value;
  if (!v) return [];
  const b = v.bazi;
  const dm = dayMaster(b);
  return [
    { label: '年柱', pillar: b.yearPillar, tenGod: SHISHEN_ZH[shiShenOf(dm, b.yearPillar.tianGan)], isDay: false },
    { label: '月柱', pillar: b.monthPillar, tenGod: SHISHEN_ZH[shiShenOf(dm, b.monthPillar.tianGan)], isDay: false },
    { label: '日柱', pillar: b.dayPillar, tenGod: '日主', isDay: true },
    { label: '时柱', pillar: b.hourPillar, tenGod: SHISHEN_ZH[shiShenOf(dm, b.hourPillar.tianGan)], isDay: false },
  ];
});

const solarEcho = computed(() => {
  const v = view.value;
  if (!v) return '';
  const c = localComponents(v.date, v.place.zone);
  return `${c.year}-${pad(c.month)}-${pad(c.day)} ${pad(c.hour)}:${pad(c.minute)} ${v.place.name}`;
});

const trueSolarEcho = computed(() => {
  const v = view.value;
  if (!v) return '';
  const c = localComponents(v.date, v.place.zone);
  return `${pad(c.hour)}:${pad(c.minute)}`;
});

const lunarEcho = computed(() => {
  const v = view.value;
  if (!v) return '';
  const lc = v.lunar;
  return `农历${lunarYearGanZhi(lc.year)}年 ${monthName(lc.month, lc.isLeap)}月${lunarDayName(lc.day)} ${ZHI_ZH[v.bazi.hourPillar.diZhi]}时`;
});

/** 农历年干支（以农历年份计，可能与年柱不同：年柱以立春为界） */
function lunarYearGanZhi(year: number): string {
  const g = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  const z = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];
  return `${g[year % 10]}${z[year % 12]}`;
}

/* ------------------------- 五行 / 十神 ------------------------- */
const wuxingRows = computed(() => {
  const v = view.value;
  if (!v) return [];
  const b = v.bazi;
  const scores = elementScores({
    allPillars: [b.yearPillar, b.monthPillar, b.dayPillar, b.hourPillar],
    monthBranch: b.monthPillar.diZhi,
  });
  const total = WUXING_LIST.reduce((s, wx) => s + scores[wx], 0) || 1;
  return WUXING_LIST.map(wx => ({ wx, score: scores[wx], pct: (scores[wx] / total) * 100 }));
});

const deChips = computed(() => {
  const v = view.value;
  if (!v) return [];
  return [
    { label: '得令', ok: v.strength.deLing },
    { label: '得地', ok: v.strength.deDi },
    { label: '得势', ok: v.strength.deShi },
  ];
});

const shiShenRows = computed(() => {
  const v = view.value;
  if (!v) return [];
  const b = v.bazi;
  const dm = dayMaster(b);
  const map = new Map<ShiShen, number>();
  const add = (code: ShiShen, w: number) => map.set(code, (map.get(code) ?? 0) + w);
  [b.yearPillar, b.monthPillar, b.hourPillar].forEach(p => add(shiShenOf(dm, p.tianGan), 1));
  [b.yearPillar, b.monthPillar, b.dayPillar, b.hourPillar].forEach(p =>
    HIDDEN_STEMS[p.diZhi].forEach(h => add(shiShenOf(dm, h.gan), h.w / 8))
  );
  const total = [...map.values()].reduce((s, x) => s + x, 0) || 1;
  return [...map.entries()]
    .map(([code, score]) => ({ code, score, pct: (score / total) * 100 }))
    .sort((a, b) => b.score - a.score);
});

/* ------------------------- 用神 ------------------------- */
const yongShenChips = computed(() => {
  const v = view.value;
  if (!v) return [];
  const y = v.yongShen;
  return [
    { label: '用神', wx: y.yongShen },
    { label: '喜神', wx: y.xiShen },
    { label: '忌神', wx: y.jiShen },
    { label: '仇神', wx: y.chouShen },
  ];
});

/* ------------------------- 大运流年 ------------------------- */
const daYunSel = ref<number | null>(null);
const now = new Date();
const currentDaYunIndex = computed(() => {
  const v = view.value;
  if (!v?.daYun) return -1;
  return v.daYun.items.findIndex(it => {
    const end = new Date(it.startDate);
    end.setFullYear(end.getFullYear() + 10);
    return now.getTime() >= it.startDate.getTime() && now.getTime() < end.getTime();
  });
});
const activeDaYun = computed(() => daYunSel.value ?? (currentDaYunIndex.value >= 0 ? currentDaYunIndex.value : 0));
const activeDaYunItem = computed<DaYunItem | null>(() => view.value?.daYun?.items[activeDaYun.value] ?? null);
const nowYear = computed(() => (view.value ? localComponents(now, view.value.place.zone).year : 0));
const liuNianRows = computed(() => {
  const v = view.value;
  const item = activeDaYunItem.value;
  if (!v || !item) return [];
  const birthYear = localComponents(v.date, v.place.zone).year;
  return liuNianOf(item, birthYear);
});
const qiYunEcho = computed(() => {
  const v = view.value;
  if (!v?.daYun) return '';
  const c = localComponents(v.daYun.qiYunDate, v.place.zone);
  return `${c.year}-${pad(c.month)}-${pad(c.day)}`;
});

/* ------------------------- 复制 ------------------------- */
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copyChart = async () => {
  const v = view.value;
  if (!v) return;
  const b = v.bazi;
  const text = [
    `${solarEcho.value} ${isMale.value ? '男' : '女'} ${lunarEcho.value}`,
    `八字：${pillarChinese(b.yearPillar)} ${pillarChinese(b.monthPillar)} ${pillarChinese(b.dayPillar)} ${pillarChinese(b.hourPillar)}`,
    `日主${GAN_ZH[dayMaster(b)]}${WUXING_ZH[ganWuxing(dayMaster(b))]} · ${STRENGTH_LEVEL_LABEL[v.strength.level]} · ${patternLabel(v.pattern.pattern)} · 用神${WUXING_ZH[v.yongShen.yongShen]}`,
  ].join('<br>');
  await copyText(text);
  copied.value = true;
  popupToast('已复制排盘结果', { type: 'success', duration: 1500 });
  copyTimer && clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copied.value = false), 1500);
};
</script>
