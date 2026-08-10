<script setup lang="ts">
import vehicleHubIcon from "../assets/vehicle-hub-2png.png";

defineProps<{ compact?: boolean }>();
</script>
<template>
  <div class="brand">
    <img class="brand-mark" :src="vehicleHubIcon" alt="Vehicle Hub by 2PNG" />
    <div v-if="!compact">
      <strong>Vehicle Hub</strong><small>VEHICLE MANAGEMENT</small>
    </div>
  </div>
</template>
