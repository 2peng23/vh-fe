<script setup lang="ts">
import { Inbox } from "lucide-vue-next";
defineProps<{ title?: string; message?: string }>();
</script>
<template>
  <div class="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
    <Inbox :size="32" class="text-slate-400" />
    <h3 class="mt-4 text-base font-extrabold text-slate-900">{{ title || "Nothing here yet" }}</h3>
    <p class="mt-1 text-sm text-slate-500">{{ message || "Create your first record to get started." }}</p>
    <slot />
  </div>
</template>
