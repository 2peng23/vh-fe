<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  X,
} from "lucide-vue-next";
import AppLogo from "../../components/AppLogo.vue";
import SupportChatView from "../SupportChatView.vue";
import { appName } from "../../config/app";
import { useAuthStore } from "../../stores/auth";
import { errorMessage } from "../../api/client";
const email = ref(""),
  password = ref(""),
  rememberMe = ref(false),
  show = ref(false),
  error = ref(""),
  auth = useAuthStore(),
  router = useRouter();
const supportOpen = ref(false);
const legalOpen = ref<"terms" | "privacy" | null>(null);
const rememberedEmailKey = "vehicle_hub_remembered_email";

onMounted(() => {
  const rememberedEmail = localStorage.getItem(rememberedEmailKey);

  if (rememberedEmail) {
    email.value = rememberedEmail;
    rememberMe.value = true;
  }
});

async function submit() {
  error.value = "";
  try {
    await auth.login(email.value, password.value);

    if (rememberMe.value) {
      localStorage.setItem(rememberedEmailKey, email.value);
    } else {
      localStorage.removeItem(rememberedEmailKey);
    }

    router.push(auth.isSuperAdmin ? "/superadmin" : "/dashboard");
  } catch (e) {
    if ((e as any)?.response?.data?.code === "BUSINESS_INACTIVE") {
      router.push("/business-disabled");
      return;
    }
    if ((e as any)?.response?.data?.code === "STAFF_INACTIVE") {
      router.push("/staff-disabled");
      return;
    }
    if ((e as any)?.response?.data?.code === "PLAN_ENDED") {
      router.push("/dashboard");
      return;
    }
    error.value = errorMessage(e);
  }
}
</script>
<template>
  <div
    class="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2 [&_.brand_strong]:text-slate-950"
  >
    <section class="grid place-items-center px-5 py-8 sm:p-10">
      <div class="w-full max-w-[390px]">
        <AppLogo />
        <!-- <RouterLink
          class="mt-6 inline-flex items-center text-xs font-bold text-slate-500 transition hover:text-teal-700"
          to="/"
        >
          &larr; Back to {{ appName }}
        </RouterLink> -->
        <div class="my-12 mb-6 lg:my-16 lg:mb-8">
          <span
            class="text-[10px] font-bold uppercase tracking-[1.5px] text-teal-700"
            >WELCOME BACK</span
          >
          <h1
            class="my-2 text-[34px] font-extrabold leading-tight text-slate-950"
          >
            Keep your vehicle moving.
          </h1>
          <p class="text-sm leading-6 text-slate-500">
            Sign in to manage vehicles, maintenance, and costs in one place.
          </p>
        </div>
        <form
          class="flex flex-col gap-4 mb-2"
          autocomplete="on"
          @submit.prevent="submit"
        >
          <div
            v-if="error"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {{ error }}
          </div>
          <label class="grid gap-2 text-xs font-bold text-slate-700">
            Email address
            <input
              v-model="email"
              type="email"
              name="email"
              required
              autocomplete="email"
              placeholder="abc@company.com"
            />
          </label>
          <label class="grid gap-2 text-xs font-bold text-slate-700">
            Password
            <div class="relative">
              <input
                v-model="password"
                :type="show ? 'text' : 'password'"
                name="password"
                class="w-full pr-11"
                required
                autocomplete="current-password"
              />
              <button
                class="absolute right-1 top-1 grid h-9 w-9 place-items-center border-0 bg-transparent text-slate-500"
                type="button"
                @click="show = !show"
              >
                <EyeOff v-if="show" class="h-[18px] w-[18px]" /><Eye
                  v-else
                  class="h-[18px] w-[18px]"
                />
              </button>
            </div>
          </label>
          <div class="flex justify-between text-[11px]">
            <label class="flex flex-row items-center gap-2 text-slate-600"
              ><input v-model="rememberMe" type="checkbox" /> Remember me</label
            >
            <a class="font-bold text-teal-700" href="#">Forgot password?</a>
          </div>
          <button
            class="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.loading"
          >
            <span v-if="auth.loading" class="spinner small"></span
            >{{ auth.loading ? "Signing in…" : `Sign in to ${appName}` }}
          </button>
        </form>
        <p class="m-6 text-center text-xs text-slate-600">
          New to {{ appName }}?
          <RouterLink class="font-bold text-teal-700" to="/register"
            >Create an account</RouterLink
          >
        </p>
        <p class="text-center text-xs text-slate-400">
          By continuing, you agree to our
          <button
            type="button"
            class="font-bold text-teal-700 transition hover:text-teal-800"
            @click="legalOpen = 'terms'"
          >
            Terms
          </button>
          and
          <button
            type="button"
            class="font-bold text-teal-700 transition hover:text-teal-800"
            @click="legalOpen = 'privacy'"
          >
            Privacy Policy</button
          >.
        </p>
        <button
          type="button"
          class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
          @click="supportOpen = true"
        >
          <MessageCircle class="h-[17px] w-[17px]" />Contact support
        </button>
      </div>
    </section>
    <section
      class="relative hidden place-items-center overflow-hidden bg-slate-950 p-10 text-white lg:grid xl:p-16"
    >
      <div class="relative z-[2] max-w-xl">
        <span
          class="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-[9px] tracking-[1.3px] text-teal-200"
          ><ShieldCheck :size="16" /> BUILT FOR VEHICLE TEAMS</span
        >
        <h2
          class="my-7 text-[46px] font-extrabold leading-tight tracking-[-1.5px] xl:text-5xl"
        >
          Every vehicle.<br /><em class="not-italic text-teal-300"
            >Always accounted for.</em
          >
        </h2>
        <p class="leading-8 text-slate-400">
          One reliable workspace for maintenance, documents, expenses, and the
          people who keep your business moving.
        </p>
        <div class="mt-8 flex flex-col gap-3">
          <span class="flex items-center gap-2 text-[13px] text-slate-200"
            ><CheckCircle2 class="h-[18px] w-[18px] text-teal-300" />Never miss
            a renewal</span
          >
          <span class="flex items-center gap-2 text-[13px] text-slate-200"
            ><CheckCircle2 class="h-[18px] w-[18px] text-teal-300" />Know every
            vehicle cost</span
          >
          <span class="flex items-center gap-2 text-[13px] text-slate-200"
            ><CheckCircle2 class="h-[18px] w-[18px] text-teal-300" />Keep
            maintenance on schedule</span
          >
        </div>
      </div>
      <div
        class="absolute inset-0 bg-[linear-gradient(120deg,transparent_58%,rgba(34,172,157,0.07)_58%,rgba(34,172,157,0.07)_59%,transparent_59%),linear-gradient(60deg,transparent_68%,rgba(255,255,255,0.025)_68%,rgba(255,255,255,0.025)_69%,transparent_69%)]"
      ></div>
    </section>
    <div
      v-if="supportOpen"
      class="modal-backdrop support-modal-backdrop"
      @click.self="supportOpen = false"
    >
      <SupportChatView embedded guest @close="supportOpen = false" />
    </div>
    <div
      v-if="legalOpen"
      class="modal-backdrop"
      @click.self="legalOpen = null"
    >
      <article
        class="max-h-[86vh] w-[min(92vw,760px)] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <header
          class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5"
        >
          <div>
            <p
              class="text-[10px] font-extrabold uppercase tracking-[1.5px] text-teal-700"
            >
              {{ appName }}
            </p>
            <h2 class="mt-1 text-2xl font-extrabold text-slate-950">
              {{ legalOpen === "terms" ? "Terms of Service" : "Privacy Policy" }}
            </h2>
          </div>
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            aria-label="Close"
            @click="legalOpen = null"
          >
            <X class="h-5 w-5" />
          </button>
        </header>

        <div
          v-if="legalOpen === 'terms'"
          class="space-y-5 px-6 py-6 text-sm leading-7 text-slate-600"
        >
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Use of {{ appName }}
            </h3>
            <p>
              {{ appName }} helps businesses manage vehicles, drivers,
              maintenance, documents, expenses, reports, subscriptions, and
              related operational records. You agree to use the system only for
              lawful business purposes and to keep your account information
              accurate.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Account Responsibilities
            </h3>
            <p>
              You are responsible for protecting your login credentials,
              managing access for your team, and reviewing records entered in
              your workspace. Activity performed through your account may be
              treated as authorized by your business.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Subscriptions and Payments
            </h3>
            <p>
              Paid plans, renewals, upgrades, and manual payment submissions are
              processed according to the plan details shown before checkout.
              Subscription access may depend on payment verification and plan
              status.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Vehicle Records
            </h3>
            <p>
              You are responsible for confirming that vehicle, maintenance,
              document, expense, and driver information entered into the system
              is complete and correct before using it for business decisions.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">Support</h3>
            <p>
              Support is provided through the available contact channels in the
              application. We may update these terms as the service changes.
            </p>
          </section>
        </div>

        <div
          v-else
          class="space-y-5 px-6 py-6 text-sm leading-7 text-slate-600"
        >
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Information We Collect
            </h3>
            <p>
              We collect account details, business profile information, vehicle
              records, driver assignments, maintenance history, expenses,
              documents, payment transaction details, notifications, and support
              messages needed to operate {{ appName }}.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              How We Use Information
            </h3>
            <p>
              Information is used to provide the application, secure accounts,
              calculate subscription limits, generate reports, send reminders,
              process manual payment records, and respond to support requests.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Sharing and Access
            </h3>
            <p>
              Workspace data is shown to authorized users in your business based
              on their role and permissions. We do not sell your business
              records.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Security and Retention
            </h3>
            <p>
              We use reasonable technical and organizational safeguards to
              protect your data. Records may be kept as long as needed for
              business operations, account history, legal compliance, and
              service reliability.
            </p>
          </section>
          <section>
            <h3 class="text-base font-extrabold text-slate-950">
              Your Choices
            </h3>
            <p>
              You may update profile details, manage workspace records, control
              staff access, and contact support for account or privacy-related
              requests.
            </p>
          </section>
        </div>
      </article>
    </div>
  </div>
</template>
