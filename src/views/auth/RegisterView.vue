<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { Check } from "lucide-vue-next";
import AppLogo from "../../components/AppLogo.vue";
import { useAuthStore } from "../../stores/auth";
import { errorMessage, validationErrors } from "../../api/client";
const form = reactive({
    business_name: "",
    owner_name: "",
    email: "",
    phone: "",
    industry: "",
    password: "",
    password_confirmation: "",
  }),
  error = ref(""),
  errors = ref<Record<string, string[]>>({}),
  auth = useAuthStore(),
  router = useRouter();
async function submit() {
  error.value = "";
  errors.value = {};
  try {
    await auth.register(form);
    router.push("/dashboard");
  } catch (e) {
    error.value = errorMessage(e);
    errors.value = validationErrors(e);
  }
}
</script>
<template>
  <div
    class="min-h-screen bg-slate-100 px-4 py-6 sm:px-8 [&_.brand_strong]:text-slate-950"
  >
    <div class="mx-auto max-w-6xl">
      <AppLogo />
      <div
        class="mt-11 grid grid-cols-1 items-center gap-5 lg:mt-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16"
      >
        <section>
          <span
            class="text-[10px] font-bold uppercase tracking-[1.5px] text-teal-700"
            >START YOUR FREE TRIAL</span
          >
          <h1
            class="my-2 text-3xl font-extrabold leading-tight text-slate-950 lg:text-[34px]"
          >
            Your vehicle, under control.
          </h1>
          <p class="hidden text-sm leading-6 text-slate-500 md:block">
            Set up your company workspace in less than two minutes. No credit
            card required.
          </p>
          <ul class="mt-7 hidden list-none p-0 md:block">
            <li class="my-3.5 flex gap-2.5 text-[13px] text-slate-700">
              <Check class="h-[18px] w-[18px] text-teal-700" />Track vehicles
              and mileage
            </li>
            <li class="my-3.5 flex gap-2.5 text-[13px] text-slate-700">
              <Check class="h-[18px] w-[18px] text-teal-700" />Automate
              maintenance reminders
            </li>
            <li class="my-3.5 flex gap-2.5 text-[13px] text-slate-700">
              <Check class="h-[18px] w-[18px] text-teal-700" />Monitor documents
              and expenses
            </li>
          </ul>
        </section>
        <form
          class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          @submit.prevent="submit"
        >
          <h2 class="text-xl font-extrabold text-slate-900">
            Create your workspace
          </h2>
          <div
            v-if="error"
            class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {{ error }}
          </div>
          <div class="grid gap-4 py-3 pb-6 md:grid-cols-2">
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Business name
              <input v-model="form.business_name" required />
              <small v-if="errors.business_name" class="text-red-600">{{
                errors.business_name[0]
              }}</small>
            </label>
            <label class="grid gap-2 text-xs font-bold text-slate-700"
              >Your name<input v-model="form.owner_name" required
            /></label>
            <label class="grid gap-2 text-xs font-bold text-slate-700"
              >Email<input v-model="form.email" type="email" required
            /></label>
            <label class="grid gap-2 text-xs font-bold text-slate-700"
              >Phone<input v-model="form.phone"
            /></label>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Industry
              <select v-model="form.industry">
                <option value="">Select industry</option>
                <option>Logistics</option>
                <option>Construction</option>
                <option>Delivery</option>
                <option>Rental</option>
                <option>Other</option>
              </select>
            </label>
            <span class="hidden md:block"></span>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Password
              <input v-model="form.password" type="password" required />
            </label>
            <label class="grid gap-2 text-xs font-bold text-slate-700">
              Confirm password
              <input
                v-model="form.password_confirmation"
                type="password"
                required
              />
            </label>
          </div>
          <button
            class="mb-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.loading"
          >
            {{ auth.loading ? "Creating workspace…" : "Create free workspace" }}
          </button>
          <p class="text-center text-xs text-slate-600">
            Already have an account?
            <RouterLink class="font-bold text-teal-700" to="/login"
              >Sign in</RouterLink
            >
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
