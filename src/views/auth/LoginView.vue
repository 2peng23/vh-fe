<script setup lang="ts">
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { Eye, EyeOff, ShieldCheck, CheckCircle2, MessageCircle } from "lucide-vue-next";
import AppLogo from "../../components/AppLogo.vue";
import SupportChatView from "../SupportChatView.vue";
import { useAuthStore } from "../../stores/auth";
import { errorMessage } from "../../api/client";
const email = ref("owner1@vh.test"),
  password = ref("password"),
  show = ref(false),
  error = ref(""),
  auth = useAuthStore(),
  router = useRouter();
const supportOpen = ref(false);
async function submit() {
  error.value = "";
  try {
    await auth.login(email.value, password.value);
    router.push(auth.isSuperAdmin ? "/superadmin" : "/");
  } catch (e) {
    if ((e as any)?.response?.data?.code === "PLAN_ENDED") {
      router.push("/plan-ended");
      return;
    }
    error.value = errorMessage(e);
  }
}
</script>
<template>
  <div class="auth-page">
    <section class="auth-panel">
      <div class="auth-form-wrap">
        <AppLogo />
        <div class="auth-heading">
          <span class="eyebrow">WELCOME BACK</span>
          <h1>Keep your vehicle moving.</h1>
          <p>
            Sign in to manage vehicles, maintenance, and costs in one place.
          </p>
        </div>
        <form @submit.prevent="submit">
          <div class="alert error" v-if="error">{{ error }}</div>
          <label
            >Email address<input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="you@company.com" /></label
          ><label
            >Password
            <div class="password-field">
              <input
                v-model="password"
                :type="show ? 'text' : 'password'"
                required
                autocomplete="current-password"
              /><button type="button" @click="show = !show">
                <EyeOff v-if="show" /><Eye v-else />
              </button></div
          ></label>
          <div class="form-row">
            <label class="check"><input type="checkbox" /> Remember me</label
            ><a href="#">Forgot password?</a>
          </div>
          <button class="btn btn-primary btn-block" :disabled="auth.loading">
            <span v-if="auth.loading" class="spinner small"></span
            >{{ auth.loading ? "Signing in…" : "Sign in to Vehicle Hub" }}
          </button>
        </form>
        <p class="auth-switch">
          New to Vehicle Hub?
          <RouterLink to="/register">Create an account</RouterLink>
        </p>
        <small class="auth-legal"
          >By continuing, you agree to our Terms and Privacy Policy.</small
        >
        <button type="button" class="login-support-button" @click="supportOpen = true"><MessageCircle />Contact support</button>
      </div>
    </section>
    <section class="auth-showcase">
      <div class="showcase-content">
        <span class="showcase-tag"
          ><ShieldCheck :size="16" /> BUILT FOR VEHICLE TEAMS</span
        >
        <h2>Every vehicle.<br /><em>Always accounted for.</em></h2>
        <p>
          One reliable workspace for maintenance, documents, expenses, and the
          people who keep your business moving.
        </p>
        <div class="showcase-points">
          <span><CheckCircle2 />Never miss a renewal</span
          ><span><CheckCircle2 />Know every vehicle cost</span
          ><span><CheckCircle2 />Keep maintenance on schedule</span>
        </div>
      </div>
      <div class="road-lines"></div>
    </section>
    <div v-if="supportOpen" class="modal-backdrop support-modal-backdrop" @click.self="supportOpen = false"><SupportChatView embedded guest @close="supportOpen = false" /></div>
  </div>
</template>
