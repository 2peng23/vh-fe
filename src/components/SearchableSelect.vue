<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Check, ChevronDown, Search } from "lucide-vue-next";

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  description?: string;
}

const props = defineProps<{
  modelValue: string | number;
  options: SearchableSelectOption[];
  placeholder?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string | number] }>();
const open = ref(false);
const query = ref("");
const selected = computed(() =>
  props.options.find((option) => String(option.value) === String(props.modelValue)),
);
const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return props.options;
  return props.options.filter((option) =>
    `${option.label} ${option.description || ""}`.toLowerCase().includes(term),
  );
});
function choose(option: SearchableSelectOption) {
  emit("update:modelValue", option.value);
  open.value = false;
  query.value = "";
}
watch(open, (value) => {
  if (!value) query.value = "";
});
</script>

<template>
  <div class="searchable-select" @keydown.esc="open = false">
    <button type="button" class="searchable-select-trigger" :aria-expanded="open" @click="open = !open">
      <span :class="{ muted: !selected }">{{ selected?.label || placeholder || "Select" }}</span>
      <ChevronDown />
    </button>
    <div v-if="open" class="searchable-select-menu">
      <div class="searchable-select-search"><Search /><input v-model="query" autofocus type="search" placeholder="Search…" /></div>
      <button v-for="option in filtered" :key="option.value" type="button" class="searchable-select-option" @click="choose(option)">
        <span><strong>{{ option.label }}</strong><small v-if="option.description">{{ option.description }}</small></span>
        <Check v-if="String(option.value) === String(modelValue)" />
      </button>
      <p v-if="!filtered.length" class="searchable-select-empty">No matching options</p>
    </div>
  </div>
</template>
