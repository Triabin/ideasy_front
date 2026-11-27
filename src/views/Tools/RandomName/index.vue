<!-- 随机姓名生成页面路由组件 -->
<template>
  <div class="w-full flex flex-col gap-4 p-4 overflow-y-auto no-scrollbar">
    <h1 class="w-full text-center text-3xl mt-2">随机姓名</h1>
    <p class="text-sm opacity-70 text-center">批量随机生成中文姓名，支持指定性别、名字字数、单姓/复姓/自定义姓氏与字辈用字，批内自动去重，点击任意结果即可复制。</p>

    <!-- 生成设置 -->
    <div class="card bg-base-200 shadow-sm">
      <div class="card-body gap-3">
        <h2 class="card-title text-base">生成设置</h2>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label class="join shrink-0">
            <button class="btn btn-sm join-item pointer-events-none">数量</button>
            <input type="number" class="input input-sm join-item w-24 font-mono" min="1" :max="MAX_COUNT" v-model.number="count"/>
          </label>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">性别：</span>
            <div class="join inline-flex align-middle">
              <button v-for="g in GENDERS" :key="g.value" class="btn btn-sm join-item"
                      :class="{ 'btn-primary': gender === g.value }"
                      @click="gender = g.value"
              >{{ g.label }}</button>
            </div>
          </div>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">名字字数：</span>
            <div class="join inline-flex align-middle">
              <button v-for="l in GIVEN_LENS" :key="String(l.value)" class="btn btn-sm join-item"
                      :class="{ 'btn-primary': givenLen === l.value }"
                      :disabled="l.value === 1 && enableGeneration"
                      :title="l.value === 1 && enableGeneration ? '开启字辈后名字固定两字（字辈不单独成名），该选项不可用' : ''"
                      @click="givenLen = l.value"
              >{{ l.label }}</button>
            </div>
          </div>

          <div class="shrink-0">
            <span class="opacity-60 mr-2">姓氏：</span>
            <div class="join inline-flex align-middle">
              <button v-for="s in SURNAME_MODES" :key="s.value" class="btn btn-sm join-item"
                      :class="{ 'btn-primary': surnameMode === s.value }" :title="s.desc"
                      @click="surnameMode = s.value"
              >{{ s.label }}</button>
            </div>
          </div>

          <!-- 自定义姓氏输入框 -->
          <input v-if="surnameMode === 'custom'"
                 v-model="customSurname"
                 type="text"
                 maxlength="4"
                 class="input input-sm input-bordered w-40 shrink-0"
                 placeholder="自定义姓氏，如：王"
                 spellcheck="false"
          />

          <!-- 字辈开关与用字输入 -->
          <div class="flex items-center gap-2 shrink-0">
            <label class="label cursor-pointer gap-2 p-0"
                   title="字辈即家族按辈分共用的取名用字。开启后所有姓名必用字辈，且字辈用字不会再出现在名字其余部分">
              <input type="checkbox" class="toggle toggle-sm toggle-primary" v-model="enableGeneration"/>
              <span>字辈</span>
            </label>
            <input v-if="enableGeneration"
                   v-model="generationChars"
                   type="text"
                   maxlength="20"
                   class="input input-sm input-bordered w-52"
                   placeholder="字辈用字（可多个），如：德文志国"
                   spellcheck="false"
            />
          </div>
        </div>

        <!-- 字辈规则说明 -->
        <p v-if="enableGeneration" class="text-xs opacity-50">
          开启后所有姓名必用字辈：从输入用字中随机取一个置于名首，字辈后再配一名用字（名字固定两字，字辈绝不单独成名）；
          输入框中的全部字（含未被抽中的其他辈分用字）绝不会再出现在名字其余部分。
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-primary btn-sm shrink-0" @click="generate">生成 {{ clampedCount }} 个姓名</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="list = []">清空</button>
          <button class="btn btn-sm shrink-0" :disabled="!list.length" @click="copyAll">复制全部</button>
          <button class="btn btn-sm btn-ghost shrink-0" :disabled="!list.length"
                  @click="clickDownload(list.map(i => i.name).join('\n'), 'text/plain', () => `names_${Date.now()}.txt`)"
          >下载 TXT</button>
          <span v-if="list.length" class="badge badge-outline font-mono shrink-0">共 {{ list.length }} 条</span>
        </div>
      </div>
    </div>

    <!-- 生成结果 -->
    <div class="card bg-base-200 shadow-sm grow">
      <div class="card-body gap-2">
        <h2 class="card-title text-base">生成结果</h2>
        <div v-if="!list.length" class="py-10 text-center opacity-50 text-sm">
          暂无数据，点击上方“生成”按钮开始。
        </div>
        <div v-else class="flex flex-col gap-1.5 overflow-y-auto pr-1">
          <div v-for="(item, idx) in list" :key="item.name + idx"
               class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:shadow transition-shadow"
               :title="`点击复制 ${item.name}`"
               @click="copy(item.name)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base font-semibold tracking-wider">{{ item.name }}</span>
              <span class="badge badge-xs border-transparent" :class="item.gender === 'male' ? 'badge-soft badge-info' : 'badge-soft badge-secondary'">
                {{ item.gender === 'male' ? '男' : '女' }}
              </span>
              <span v-if="item.compound" class="badge badge-xs badge-ghost">复姓</span>
              <span v-if="item.generation" class="badge badge-xs badge-soft badge-primary border-transparent"
                    :title="`使用了字辈「${item.generation}」`"
              >字辈·{{ item.generation }}</span>
            </div>
            <div class="shrink-0 opacity-60">
              <Copied v-if="copiedText === item.name" :size="16" :twClasses="['fill-success']"/>
              <Copy v-else :size="16"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { copyText, popupToast, clickDownload } from '@/common/utils';
import { randomName, type GenName, type Gender, type SurnameMode } from './nameData';

/** 单次最多生成数量 */
const MAX_COUNT = 200;

const GENDERS = [
  { value: 'any', label: '随机' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
] as const;
const GIVEN_LENS = [
  { value: 'random', label: '随机' },
  { value: 1, label: '1 字' },
  { value: 2, label: '2 字' },
] as const;
const SURNAME_MODES = [
  { value: 'mix', label: '随机', desc: '约 12% 概率出现复姓' },
  { value: 'single', label: '单姓', desc: '只使用单字姓' },
  { value: 'compound', label: '复姓', desc: '只使用欧阳、司马等复姓' },
  { value: 'custom', label: '自定义', desc: '使用输入框中填写的姓氏（单字或多字均可）' },
] as const;

const count = ref<number>(10);
const gender = ref<Gender>('any');
const givenLen = ref<1 | 2 | 'random'>('random');
const surnameMode = ref<SurnameMode>('mix');
const customSurname = ref<string>('');
const enableGeneration = ref<boolean>(false);
const generationChars = ref<string>('');
const list = ref<GenName[]>([]);
const copiedText = ref<string>('');

const clampedCount = computed(() => Math.min(Math.max(Math.trunc(count.value) || 1, 1), MAX_COUNT));

// 开启字辈后名字固定两字，「1 字」不再适用：自动切回随机
watch(enableGeneration, on => {
  if (on && givenLen.value === 1) givenLen.value = 'random';
});

/** 生成一批不重复姓名 */
function generate() {
  if (surnameMode.value === 'custom' && !customSurname.value.trim()) {
    popupToast('请先填写自定义姓氏', { type: 'warning', duration: 2000 });
    return;
  }
  if (enableGeneration.value && !generationChars.value.trim()) {
    popupToast('已开启字辈，请填写字辈用字（一个或多个）', { type: 'warning', duration: 2000 });
    return;
  }
  const n = clampedCount.value;
  const seen = new Set<string>();
  const out: GenName[] = [];
  // 去重可能导致少量失败，限制尝试次数避免死循环
  let guard = 0;
  while (out.length < n && guard++ < n * 50) {
    const item = randomName({
      gender: gender.value,
      givenLen: givenLen.value,
      surnameMode: surnameMode.value,
      customSurname: customSurname.value,
      generationChars: enableGeneration.value ? generationChars.value : '',
    });
    if (seen.has(item.name)) continue;
    seen.add(item.name);
    out.push(item);
  }
  list.value = out;
  if (out.length < n) {
    popupToast(`当前选项组合有限，仅生成 ${out.length} 个不重复姓名`, { type: 'warning', duration: 2500 });
  }
}

let copyTimer: ReturnType<typeof setTimeout> | null = null;
const copy = async (text: string) => {
  if (!text) return;
  try {
    await copyText(text);
    copiedText.value = text;
    popupToast(`已复制 ${text}`, { type: 'success', duration: 1200 });
  } catch (e: any) {
    popupToast(e?.message ?? '复制失败', { type: 'error', duration: 2500 });
  }
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copiedText.value = ''), 1200);
};

const copyAll = async () => {
  if (!list.value.length) return;
  try {
    await copyText(list.value.map(i => i.name).join('\n'));
    popupToast(`已复制全部 ${list.value.length} 个姓名`, { type: 'success', duration: 1500 });
  } catch (e: any) {
    popupToast(e?.message ?? '复制失败', { type: 'error', duration: 2500 });
  }
};

onBeforeUnmount(() => copyTimer && clearTimeout(copyTimer));
</script>
