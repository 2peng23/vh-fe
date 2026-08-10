<script setup lang="ts">
import type { PaginationMeta } from "../types";

defineProps<{ meta: PaginationMeta; page: number; perPage: number }>();
const emit = defineEmits<{
  "update:page": [value: number];
  "update:perPage": [value: number];
}>();
</script>

<template>
  <div class="pagination">
    <div class="page-size">
      <span>Rows per page</span>
      <select
        :value="perPage"
        @change="
          emit(
            'update:perPage',
            Number(($event.target as HTMLSelectElement).value),
          )
        "
      >
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
      <span>{{ meta.total }} total</span>
    </div>
    <div class="page-nav">
      <span>Page {{ meta.current_page }} of {{ meta.last_page }}</span>
      <button :disabled="page <= 1" @click="emit('update:page', page - 1)">
        Previous
      </button>
      <button
        :disabled="page >= meta.last_page"
        @click="emit('update:page', page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
