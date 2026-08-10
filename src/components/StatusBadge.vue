<script setup lang="ts">
defineProps<{ status: string }>();
</script>
<template>
  <span
    class="status-badge"
    :class="`status-${status?.toLowerCase().replaceAll(' ', '_')}`"
    ><i></i>{{ status?.replaceAll("_", " ") }}</span
  >
</template>
