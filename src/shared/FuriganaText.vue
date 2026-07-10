<script setup lang="ts">
// 假名 ruby 渲染：content 弹层与复习页共用。
// rt 的样式随使用方的样式体系（Shadow DOM CSS / Tailwind）不同，经 rtClass 注入。
import type { FuriganaSegment } from './furigana';

defineProps<{ segments: FuriganaSegment[]; rtClass?: string }>();
</script>

<template>
  <template v-for="(seg, i) in segments" :key="i">
    <ruby v-if="seg.reading">{{ seg.surface }}<rt :class="rtClass">{{ seg.reading }}</rt></ruby>
    <span v-else>{{ seg.surface }}</span>
  </template>
</template>
