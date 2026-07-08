<script setup lang="ts">
// 轻量组合框：预设下拉 + 自由输入（复刻参考项目 NAutoComplete 的交互）。
// 输入即写入 v-model（允许任意自定义值）；点选项则填入其 value。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

const props = defineProps<{
  modelValue: string;
  options: ComboOption[];
  placeholder?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

// 按输入过滤（匹配 value/label/hint）；无匹配则回退全部
const filtered = computed(() => {
  const q = props.modelValue.trim().toLowerCase();
  if (!q) return props.options;
  const matched = props.options.filter(
    (o) =>
      o.value.toLowerCase().includes(q) ||
      o.label.toLowerCase().includes(q) ||
      (o.hint ?? '').toLowerCase().includes(q),
  );
  return matched.length ? matched : props.options;
});

function onInput(e: Event): void {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
  open.value = true;
}

function select(o: ComboOption): void {
  emit('update:modelValue', o.value);
  open.value = false;
}

function onDocPointerDown(e: MouseEvent): void {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false;
}

onMounted(() => document.addEventListener('mousedown', onDocPointerDown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocPointerDown));
</script>

<template>
  <div ref="rootEl" class="relative">
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      autocomplete="off"
      spellcheck="false"
      class="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none"
      @input="onInput"
      @focus="open = true"
      @keydown.esc="open = false"
    />
    <ul
      v-if="open && filtered.length"
      class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
    >
      <li
        v-for="o in filtered"
        :key="o.value"
        class="flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm hover:bg-indigo-50"
        @mousedown.prevent="select(o)"
      >
        <span class="font-medium text-gray-800">{{ o.label }}</span>
        <span v-if="o.hint" class="truncate font-mono text-xs text-gray-400">{{ o.hint }}</span>
      </li>
    </ul>
  </div>
</template>
