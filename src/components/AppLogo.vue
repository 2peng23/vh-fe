<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import vehicleHubIcon from "../assets/vehicle-hub-2png.png";
import { appName, appTagline } from "../config/app";

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    theme?: "light" | "dark";
  }>(),
  {
    compact: false,
    theme: "light",
  },
);

const titleClass = computed(() =>
  props.theme === "dark" ? "text-white" : "text-slate-950",
);

const subtitleClass = computed(() =>
  props.theme === "dark" ? "text-slate-400" : "text-slate-500",
);
</script>

<template>
  <RouterLink
    to="/"
    class="inline-flex items-center gap-[11px] no-underline"
    :aria-label="`Go to ${appName} home`"
  >
    <img
      :src="vehicleHubIcon"
      :alt="`${appName} by 2PNG`"
      class="block h-[34px] w-[34px] rounded-[7px] object-contain"
    />

    <div v-if="!compact" class="min-w-0">
      <strong
        class="block font-['Manrope'] text-xl font-extrabold leading-none"
        :class="titleClass"
      >
        {{ appName }}
      </strong>

      <small
        class="mt-1 block text-[7px] font-semibold tracking-[1.8px]"
        :class="subtitleClass"
      >
        {{ appTagline }}
      </small>
    </div>
  </RouterLink>
</template>
