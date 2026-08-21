<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowRight, CheckCircle2 } from "lucide-vue-next";
import ProductPreview from "./ProductPreview.vue";
import { appName } from "../../config/app";

defineProps<{ trialLabel: string }>();
</script>

<template>
  <section id="hero" class="bg-white pt-12 md:pt-16 lg:pt-20">
    <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 md:pb-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-24">
      <div>
        <div class="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-800">
          <CheckCircle2 class="h-4 w-4" />
          {{ trialLabel }}
        </div>
        <h1 class="mt-6 max-w-3xl font-['Manrope'] text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
          Manage Your Vehicles Smarter. Run Your Business Better.
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
          {{ appName }} helps businesses manage vehicles, maintenance, mileage, expenses, documents, drivers, issues, and vehicle operations from one centralized platform.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" to="/register">
            Start Free Trial
            <ArrowRight class="h-4 w-4" />
          </RouterLink>
          <a class="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" href="#pricing">
            View Plans
          </a>
        </div>
      </div>
      <ProductPreview />
    </div>
  </section>
</template>
