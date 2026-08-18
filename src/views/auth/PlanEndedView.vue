<script setup lang="ts">
import { LifeBuoy } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppLogo from "../../components/AppLogo.vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const checkingAccess = ref(false);
let accessTimer: number | undefined;

/** Refresh server-side access state and leave this page after plan activation. */
async function refreshAccessStatus() {
  if (checkingAccess.value || auth.isImpersonating) return;
  checkingAccess.value = true;
  try {
    await auth.fetchAccessStatus();
    if (auth.businessInactive) {
      await router.replace("/business-disabled");
    } else if (!auth.planEnded) {
      await router.replace("/");
    }
  } catch {
    // The API client handles expired sessions; expired plans remain on this page.
  } finally {
    checkingAccess.value = false;
  }
}

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

/** Restore the saved administrator session after inspecting an expired tenant account. */
async function returnToSuperAdmin() {
  await auth.stopImpersonating();
  await router.replace("/superadmin");
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#071a2b_0%,#0b2a42_45%,#071a2b_58%,#051522_100%)] p-6 [&_.brand]:mb-8 [&_.brand]:justify-center">
    <section class="w-full max-w-[480px] rounded-2xl bg-white p-9 text-center shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <AppLogo />
      <div class="mx-auto mb-5 mt-8 grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-700">
        <LifeBuoy class="h-8 w-8" />
      </div>
      <span class="text-[10px] font-bold uppercase tracking-[1.5px] text-teal-700">ACCOUNT ACCESS PAUSED</span>
      <h1 class="my-2 mb-2.5 text-3xl font-extrabold text-slate-950">Your plan has ended</h1>
      <p v-if="auth.isOwner" class="mb-6 leading-7 text-slate-500">
        Access for the owner and all staff accounts is currently disabled.
        Purchase a plan to renew or reactivate your account.
      </p>
      <p v-else class="mb-6 leading-7 text-slate-500">
        Your business plan has ended and access is currently disabled.
        Please notify your business owner. Only the owner can contact Vehicle Hub support and manage the renewal.
      </p>
      <button v-if="auth.isOwner" class="flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800" type="button" @click="router.push('/plan-transactions?purchase=1')">Purchase plan</button>
      <button v-if="auth.isImpersonating" class="mt-2.5 flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50" type="button" @click="returnToSuperAdmin">Return to Super Admin</button>
    </section>
  </main>
</template>
