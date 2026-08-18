<script setup lang="ts">
import type { Component } from "vue";
import {
  BarChart3,
  CarFront,
  FileText,
  Fuel,
  Gauge,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-vue-next";

const features: Array<{ title: string; description: string; icon: Component }> = [
  { title: "Vehicle Management", description: "Keep vehicle details, status, records, and operational information organized.", icon: CarFront },
  { title: "Maintenance Tracking", description: "Monitor service history, preventive maintenance, and upcoming maintenance needs.", icon: Wrench },
  { title: "Mileage Tracking", description: "Record mileage and maintain accurate usage history for every vehicle.", icon: Gauge },
  { title: "Expense Tracking", description: "Track vehicle expenses and understand where your operating costs are going.", icon: ReceiptText },
  { title: "Fuel Management", description: "Record and monitor vehicle fuel transactions.", icon: Fuel },
  { title: "Document Management", description: "Keep important vehicle documents organized and accessible.", icon: FileText },
  { title: "Issue Tracking", description: "Report, assign, and monitor vehicle issues until they are resolved.", icon: TriangleAlert },
  { title: "Drivers & Assignments", description: "Manage drivers and vehicle assignments from one system.", icon: Users },
  { title: "Reports", description: "Review operational and expense information using centralized reporting.", icon: BarChart3 },
  { title: "Roles & Permissions", description: "Control what owners and staff members can access.", icon: ShieldCheck },
];
</script>

<template>
  <section id="features" class="bg-slate-50 py-16 md:py-20 lg:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl">
        <p class="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Fleet workspace</p>
        <h2 class="mt-3 font-['Manrope'] text-3xl font-extrabold text-slate-950 md:text-4xl">
          Everything You Need to Manage Your Fleet
        </h2>
        <p class="mt-4 text-base leading-7 text-slate-600">
          Bring the daily work of vehicle operations into one clean system your team can keep current.
        </p>
      </div>
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <article v-for="feature in features" :key="feature.title" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md motion-reduce:hover:translate-y-0">
          <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <component :is="feature.icon" class="h-5 w-5" />
          </span>
          <h3 class="mt-4 font-['Manrope'] text-base font-extrabold text-slate-950">{{ feature.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ feature.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
