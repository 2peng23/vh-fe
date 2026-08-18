<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <section class="bg-teal-700 py-16 text-white md:py-20">
    <div class="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
      <h2 class="font-['Manrope'] text-3xl font-extrabold md:text-4xl">Ready to Take Control of Your Vehicle Operations?</h2>
      <p class="mx-auto mt-4 max-w-2xl text-base leading-7 text-teal-50">Start your Vehicle Hub free trial today.</p>
      <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <RouterLink class="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-extrabold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-700" to="/register">
          Start Free Trial
        </RouterLink>
        <RouterLink class="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 px-5 text-sm font-extrabold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-teal-700" to="/login">
          Already have an account? Login
        </RouterLink>
      </div>
    </div>
  </section>
</template>
