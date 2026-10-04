<!-- 颜色转换 -->
<template>
  <div class="w-full h-full mt-5 p-4 rounded-md flex flex-col justify-center items-center gap-4" :style="{ 'background-color': currColor }">
    <div class="flex items-center justify-center w-full gap-4">
      <label class="input">
        RGB
        <input type="text" class="grow" v-model="rgb" placeholder="#XXX or #XXXXXX"/>
      </label>

      <label class="input">
        RGBA
        <input type="text" class="grow" v-model="rgba" placeholder="#XXXX or #XXXXXXXX"/>
        <Copy/>
        <Copied/>
      </label>
    </div>

    <div class="flex items-center justify-center w-full gap-4">
      <label class="input">
        RGB
        <input type="text" class="grow" v-model="rgb" placeholder="#XXX or #XXXXXX"/>
      </label>

      <label class="input">
        RGBA
        <input type="text" class="grow" v-model="rgba" placeholder="#XXXX or #XXXXXXXX"/>
      </label>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import Copy from '@/components/icons/Copy.vue';
import Copied from '@/components/icons/Copied.vue';

const currColor = ref<string>('#959191');
const rgb = ref<string | null>('');
const rgba = ref<string | null>('');

const formMap: Record<string, {
  key: string,
  label: string,
  placeHolder?: string,
  copied: boolean
}> = {

};
</script>
