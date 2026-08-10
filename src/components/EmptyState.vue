<script setup lang="ts">
import { Inbox } from "lucide-vue-next";
defineProps<{ title?: string; message?: string }>();
</script>
<template>
  <div class="empty-state">
    <Inbox :size="32" />
    <h3>{{ title || "Nothing here yet" }}</h3>
    <p>{{ message || "Create your first record to get started." }}</p>
    <slot />
  </div>
</template>
