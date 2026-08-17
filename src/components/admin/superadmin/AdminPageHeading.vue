<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <div class="superadmin-heading">
    <div>
      <span class="eyebrow">PLATFORM ADMINISTRATION</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <slot name="actions" />
  </div>
</template>
