<script setup lang="ts">
const vehicles = [
  { plate: "VH-2048", model: "Isuzu NPR", status: "Active", due: "Service in 4 days" },
  { plate: "TRK-118", model: "Hino 500", status: "In shop", due: "Brake inspection" },
  { plate: "VAN-041", model: "Toyota HiAce", status: "Active", due: "Docs renewed" },
];
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 sm:p-5">
    <div class="flex items-center justify-between border-b border-slate-200 pb-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Fleet overview</p>
        <h2 class="mt-1 font-['Manrope'] text-xl font-extrabold text-slate-950">Operations Dashboard</h2>
      </div>
      <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Live ready</span>
    </div>

    <div class="grid grid-cols-2 gap-3 py-4 lg:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p class="text-xs font-semibold text-slate-500">Total Vehicles</p>
        <strong class="mt-2 block font-['Manrope'] text-2xl text-slate-950">48</strong>
      </div>
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p class="text-xs font-semibold text-amber-700">Maintenance Due</p>
        <strong class="mt-2 block font-['Manrope'] text-2xl text-amber-900">7</strong>
      </div>
      <div class="rounded-xl border border-red-200 bg-red-50 p-3">
        <p class="text-xs font-semibold text-red-700">Open Issues</p>
        <strong class="mt-2 block font-['Manrope'] text-2xl text-red-900">3</strong>
      </div>
      <div class="rounded-xl border border-teal-200 bg-teal-50 p-3">
        <p class="text-xs font-semibold text-teal-700">Monthly Expenses</p>
        <strong class="mt-2 block font-['Manrope'] text-2xl text-teal-900">₱82k</strong>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="rounded-xl border border-slate-200">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <strong class="text-sm text-slate-900">Recent Vehicles</strong>
          <span class="text-xs font-semibold text-slate-500">3 updated</span>
        </div>
        <div class="divide-y divide-slate-100">
          <div v-for="vehicle in vehicles" :key="vehicle.plate" class="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
            <div>
              <p class="text-sm font-extrabold text-slate-900">{{ vehicle.plate }}</p>
              <p class="text-xs text-slate-500">{{ vehicle.model }}</p>
            </div>
            <div class="text-right">
              <span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{{ vehicle.status }}</span>
              <p class="mt-2 text-xs text-slate-500">{{ vehicle.due }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-4">
        <div class="rounded-xl border border-slate-200 p-4">
          <div class="flex items-center justify-between">
            <strong class="text-sm text-slate-900">Maintenance Activity</strong>
            <span class="text-xs font-bold text-teal-700">This week</span>
          </div>
          <div class="mt-4 space-y-3">
            <span class="block h-2 rounded-full bg-teal-600"></span>
            <span class="block h-2 w-4/5 rounded-full bg-slate-200"></span>
            <span class="block h-2 w-3/5 rounded-full bg-slate-200"></span>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 p-4">
          <strong class="text-sm text-slate-900">Expense Summary</strong>
          <div class="mt-4 grid grid-cols-3 gap-2">
            <span class="h-16 rounded-lg bg-slate-100"></span>
            <span class="h-20 rounded-lg bg-teal-100"></span>
            <span class="h-12 rounded-lg bg-amber-100"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
