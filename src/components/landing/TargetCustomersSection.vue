<script setup lang="ts">
const customers = [
  "Trucking Companies",
  "Logistics Businesses",
  "Delivery Operations",
  "Construction Fleets",
  "Service Companies",
  "Corporate Vehicle Fleets",
  "Rental Businesses",
  "Small and Medium Businesses",
];
</script>

<template>
  <section class="bg-slate-950 py-16 text-white md:py-20 lg:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl">
        <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-300">Who it serves</p>
        <h2 class="mt-3 font-['Manrope'] text-3xl font-extrabold md:text-4xl">Built for Businesses That Manage Vehicles</h2>
        <p class="mt-4 text-base leading-7 text-slate-300">
          Vehicle Hub fits teams that need practical tracking for owned, assigned, or serviced vehicles.
        </p>
      </div>
      <div class="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="customer in customers" :key="customer" class="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-extrabold text-slate-100">
          {{ customer }}
        </div>
      </div>
    </div>
  </section>
</template>
