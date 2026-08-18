<script setup lang="ts">
const steps = [
  { title: "Create Your Business Account", description: "Register your business and start your free trial." },
  { title: "Add Your Vehicles", description: "Add vehicles, drivers, maintenance records, expenses, documents, and other fleet information." },
  { title: "Manage Everything in One Place", description: "Monitor your fleet and operations from the Vehicle Hub dashboard." },
];
</script>

<template>
  <section class="bg-white py-16 md:py-20 lg:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Simple setup</p>
          <h2 class="mt-3 font-['Manrope'] text-3xl font-extrabold text-slate-950 md:text-4xl">How It Works</h2>
          <p class="mt-4 text-base leading-7 text-slate-600">
            Start with your business account, then add the records your operation needs day to day.
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <article v-for="(step, index) in steps" :key="step.title" class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <span class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-extrabold text-white">{{ index + 1 }}</span>
            <h3 class="mt-5 font-['Manrope'] text-lg font-extrabold text-slate-950">{{ step.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-600">{{ step.description }}</p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
