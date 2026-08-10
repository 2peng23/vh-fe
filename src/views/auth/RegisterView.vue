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
    router.push("/");
  } catch (e) {
    error.value = errorMessage(e);
    errors.value = validationErrors(e);
  }
}
</script>
<template>
  <div class="register-page">
    <div class="register-wrap">
      <AppLogo />
      <div class="register-grid">
        <section>
          <span class="eyebrow">START YOUR 30-DAY FREE TRIAL</span>
          <h1>Your vehicle, under control.</h1>
          <p>
            Set up your company workspace in less than two minutes. No credit
            card required.
          </p>
          <ul>
            <li><Check />Track vehicles and mileage</li>
            <li><Check />Automate maintenance reminders</li>
            <li><Check />Monitor documents and expenses</li>
          </ul>
        </section>
        <form class="card form-card" @submit.prevent="submit">
          <h2>Create your workspace</h2>
          <div class="alert error" v-if="error">{{ error }}</div>
          <div class="field-grid">
            <label
              >Business name<input
                v-model="form.business_name"
                required
              /><small v-if="errors.business_name">{{
                errors.business_name[0]
              }}</small></label
            ><label>Your name<input v-model="form.owner_name" required /></label
            ><label
              >Email<input v-model="form.email" type="email" required /></label
            ><label>Phone<input v-model="form.phone" /></label
            ><label
              >Industry<select v-model="form.industry">
                <option value="">Select industry</option>
                <option>Logistics</option>
                <option>Construction</option>
                <option>Delivery</option>
                <option>Rental</option>
                <option>Other</option>
              </select></label
            ><span></span
            ><label
              >Password<input
                v-model="form.password"
                type="password"
                required /></label
            ><label
              >Confirm password<input
                v-model="form.password_confirmation"
                type="password"
                required
            /></label>
          </div>
          <button class="btn btn-primary btn-block" :disabled="auth.loading">
            {{ auth.loading ? "Creating workspace…" : "Create free workspace" }}
          </button>
          <p>
            Already have an account?
            <RouterLink to="/login">Sign in</RouterLink>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>
