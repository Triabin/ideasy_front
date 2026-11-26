<template>
  <div class="w-full h-full relative"
       :style="{ width: `${props.size * 1.1}px`, height: styles.height, fontSize: styles.fontSize }">
    <div class="card card-1" :style="{ width: styles.width, lineHeight: styles.height }">
      {{ props.currValue }}
    </div>
    <div ref="card2Ref" class="card card-2 z-overlay" :style="{ width: styles.width }">
      {{ props.currValue }}
    </div>
    <div ref="card3Ref" class="card card-3" :style="{ width: styles.width, lineHeight: styles.height }">
      {{ prev }}
    </div>
    <div class="card card-4" :style="{ width: styles.width }">
      {{ prev }}
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue';

// 父组件传入的属性
const props = withDefaults(defineProps<{
  size: number,
  currValue: string,
}>(), {
  size: 40,
});

// 响应式数据
const card2Ref = useTemplateRef<HTMLElement>('card2Ref');
const card3Ref = useTemplateRef<HTMLElement>('card3Ref');
const styles = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${props.size * 0.8}px`,
}));

const prev = ref(props.currValue);
let timer: NodeJS.Timeout | undefined;
watch(() => [props.currValue], () => {
  if (!card2Ref.value ||!card3Ref.value) return;
  card2Ref.value.style.transition = '0.5s';
  card3Ref.value.style.transition = '0.5s';
  card2Ref.value.style.transform = 'rotateX(0deg)';
  card3Ref.value.style.transform = 'rotateX(-180deg)';

  timer && clearTimeout(timer);
  timer = setTimeout(() => {
    if (!card2Ref.value ||!card3Ref.value) return;
    card2Ref.value.style.transition = 'none';
    card3Ref.value.style.transition = 'none';
    card2Ref.value.style.transform = 'rotateX(180deg)';
    card3Ref.value.style.transform = 'rotateX(0deg)';
    prev.value = props.currValue;
  }, 500);
});
</script>
<style lang="css" scoped>
.card {
  width: 100%;
  height: 48%;
  background-color: var(--color-primary);
  color: var(--color-primary-content);
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
  backface-visibility: hidden; /* 旋转后卡片背对着重叠在上面，需要隐藏卡片背面 */
  transition: 0.5s;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.card-1 {
  line-height: 100%; /* 行高设置为自身高度（这样就只显示文字上半身） */
}

.card-2 {
  top: 50%; /* 卡片只显示一半 */
  line-height: 0; /* 文字中心设为可显示部分顶端（这样就只显示文字下半身） */
  transform: rotateX(180deg); /* 文字卡片向上旋转180度 */
  transform-origin: center top; /* 卡片旋转的中轴线设置为顶边 */
}

.card-3 {
  line-height: 100%;
  transform-origin: center bottom;
}

.card-4 {
  top: 50%;
  line-height: 0;
}

</style>
