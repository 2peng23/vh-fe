<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { Menu, X } from "lucide-vue-next";
import vehicleHubIcon from "../../assets/vehicle-hub-2png.png";

const open = ref(false);
const navItems = [
  { label: "Home", href: "#hero" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

function closeMenu() {
  open.value = false;
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
    <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Public navigation">
      <a class="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" href="#hero" @click="closeMenu">
        <img class="h-10 w-10 rounded-lg object-contain" :src="vehicleHubIcon" alt="" />
        <span class="flex flex-col leading-none">
          <strong class="font-['Manrope'] text-base font-extrabold text-slate-950">Vehicle Hub</strong>
          <small class="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Fleet Management</small>
        </span>
      </a>

      <div class="hidden items-center gap-8 lg:flex">
        <a
          v-for="item in navItems"
          :key="item.href"
          class="text-sm font-bold text-slate-600 transition-colors hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-4"
          :href="item.href"
        >
          {{ item.label }}
        </a>
      </div>

      <div class="hidden items-center gap-3 lg:flex">
        <RouterLink class="rounded-lg px-4 py-2 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" to="/login">
          Login
        </RouterLink>
        <RouterLink class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" to="/register">
          Start Free Trial
        </RouterLink>
      </div>

      <button
        class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 lg:hidden"
        type="button"
        :aria-expanded="open"
        aria-controls="mobile-public-menu"
        aria-label="Toggle navigation"
        @click="open = !open"
      >
        <X v-if="open" class="h-5 w-5" />
        <Menu v-else class="h-5 w-5" />
      </button>
    </nav>

    <div v-if="open" id="mobile-public-menu" class="border-t border-slate-200 bg-white px-4 py-4 shadow-sm lg:hidden">
      <div class="mx-auto grid max-w-7xl gap-2">
        <a
          v-for="item in navItems"
          :key="item.href"
          class="rounded-lg px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
          :href="item.href"
          @click="closeMenu"
        >
          {{ item.label }}
        </a>
        <div class="mt-2 grid gap-2 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <RouterLink class="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-extrabold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600" to="/login" @click="closeMenu">
            Login
          </RouterLink>
          <RouterLink class="rounded-lg bg-teal-700 px-4 py-3 text-center text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600" to="/register" @click="closeMenu">
            Start Free Trial
          </RouterLink>
        </div>
      </div>
    </div>
  </header>
</template>
