<script setup lang="ts">
import { CheckCircle2 } from "lucide-vue-next";

const benefits = [
  "Centralized Fleet Records",
  "Less Spreadsheet Tracking",
  "Better Maintenance Visibility",
  "Clearer Operating Costs",
  "Improved Team Coordination",
  "Better Operational Visibility",
];
</script>

<template>
  <section class="bg-white py-16 md:py-20 lg:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Why Vehicle Hub</p>
          <h2 class="mt-3 font-['Manrope'] text-3xl font-extrabold text-slate-950 md:text-4xl">Built for Clearer Vehicle Operations</h2>
          <p class="mt-4 text-base leading-7 text-slate-600">
            Keep records, tasks, costs, and team activity easier to find, update, and review.
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div v-for="benefit in benefits" :key="benefit" class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <CheckCircle2 class="h-5 w-5 flex-none text-teal-700" />
            <span class="text-sm font-extrabold text-slate-800">{{ benefit }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
