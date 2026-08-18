<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import AppLogo from "../../components/AppLogo.vue";
import SupportChatView from "../SupportChatView.vue";
import { useAuthStore } from "../../stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
const supportOpen = ref(false);
const checkingAccess = ref(false);
let accessTimer: number | undefined;

/** Refresh server-side access state and leave this page after reactivation. */
async function refreshAccessStatus() {
  if (checkingAccess.value || auth.isImpersonating) return;
  checkingAccess.value = true;
  try {
    await auth.fetchAccessStatus();
    if (!auth.businessInactive && !auth.staffInactive) {
      await router.replace("/");
    }
  } catch {
    // The API client handles expired sessions; inactive accounts remain on this page.
  } finally {
    checkingAccess.value = false;
  }
}

const staffAccountInactive = computed(() => auth.staffInactive);

/** Recheck immediately when the user returns to this browser tab. */
function handleWindowFocus() {
  void refreshAccessStatus();
}

onMounted(() => {
  void refreshAccessStatus();
  accessTimer = window.setInterval(refreshAccessStatus, 5000);
  window.addEventListener("focus", handleWindowFocus);
});

onBeforeUnmount(() => {
  if (accessTimer !== undefined) window.clearInterval(accessTimer);
  window.removeEventListener("focus", handleWindowFocus);
});

/** Restore the saved administrator session after inspecting a disabled tenant account. */
async function returnToSuperAdmin() {
  await auth.stopImpersonating();
  await router.replace("/superadmin");
}

/** Clear the inactive staff session so another account can sign in. */
async function backToLogin() {
  try {
    await auth.logout();
  } catch {
    // Inactive staff tokens are blocked by the API, but logout still clears the local session.
  }
  await router.replace("/login");
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#071a2b_0%,#0b2a42_45%,#071a2b_58%,#051522_100%)] p-6 [&_.brand]:mb-8 [&_.brand]:justify-center">
    <section class="w-full max-w-[480px] rounded-2xl bg-white p-9 text-center shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <AppLogo />
      <div class="mx-auto mb-4 mt-8 w-fit rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-red-700">Account disabled</div>
      <template v-if="staffAccountInactive">
        <span class="text-[10px] font-bold uppercase tracking-[1.5px] text-teal-700">STAFF ACCESS DISABLED</span>
        <h1 class="my-2 mb-2.5 text-3xl font-extrabold text-slate-950">Your staff account is inactive</h1>
        <p class="mb-6 leading-7 text-slate-500">
          Your access was disabled by the business owner. Your account
          information remains stored, but you cannot access the business until
          the owner reactivates it. Please contact your business owner for
          assistance.
        </p>
        <button
          class="flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800"
          type="button"
          @click="backToLogin"
        >
          Back to login
        </button>
      </template>
      <template v-else>
        <span class="text-[10px] font-bold uppercase tracking-[1.5px] text-teal-700">BUSINESS ACCESS DISABLED</span>
        <h1 class="my-2 mb-2.5 text-3xl font-extrabold text-slate-950">This business account is inactive</h1>
        <p v-if="auth.isOwner" class="mb-6 leading-7 text-slate-500">
          Your business was disabled by the platform administrator. Your plan
          information and business data remain stored, but access is paused.
          Contact Vehicle Hub support for assistance.
        </p>
        <p v-else class="mb-6 leading-7 text-slate-500">
          This business was disabled by the platform administrator. Owner and
          staff access is currently paused. Please notify your business owner.
        </p>
        <button
          v-if="auth.isOwner"
          class="flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800"
          type="button"
          @click="supportOpen = true"
        >
          Contact support
        </button>
      </template>
      <button
        v-if="auth.isImpersonating"
        class="mt-2.5 flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
        type="button"
        @click="returnToSuperAdmin"
      >
        Return to Super Admin
      </button>
    </section>
    <div
      v-if="supportOpen"
      class="modal-backdrop support-modal-backdrop"
      @click.self="supportOpen = false"
    >
      <SupportChatView embedded @close="supportOpen = false" />
    </div>
  </main>
</template>
