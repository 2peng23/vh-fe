<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppLogo from "../AppLogo.vue";
import { appName } from "../../config/app";

const emit = defineEmits<{
  "open-support": [];
}>();
const year = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-slate-200 bg-white">
    <div
      class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8"
    >
      <div>
        <AppLogo />
      </div>
      <div>
        <h3
          class="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500"
        >
          Product
        </h3>
        <div class="mt-4 grid gap-3 text-sm font-bold text-slate-700">
          <a class="hover:text-teal-700" href="#features">Features</a>
          <a class="hover:text-teal-700" href="#pricing">Pricing</a>
        </div>
      </div>
      <div>
        <h3
          class="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500"
        >
          Account
        </h3>
        <div class="mt-4 grid gap-3 text-sm font-bold text-slate-700">
          <RouterLink class="hover:text-teal-700" to="/login">Login</RouterLink>
          <RouterLink class="hover:text-teal-700" to="/register"
            >Register</RouterLink
          >
        </div>
      </div>
      <div>
        <h3
          class="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500"
        >
          Support
        </h3>

        <div class="mt-4 grid gap-3 text-sm font-bold text-slate-700">
          <button
            type="button"
            class="cursor-pointer w-fit border-0 bg-transparent p-0 text-left font-bold text-slate-700 transition hover:text-teal-700"
            @click="emit('open-support')"
          >
            Contact support
          </button>
        </div>
      </div>
    </div>
    <div
      class="border-t border-slate-200 px-4 py-5 text-center text-xs font-semibold text-slate-500"
    >
      © {{ year }} {{ appName }}. All rights reserved.
    </div>
  </footer>
</template>
