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
  <main class="plan-ended-page">
    <section class="plan-ended-card">
      <AppLogo />
      <div class="disabled-account-mark">Account disabled</div>
      <template v-if="staffAccountInactive">
        <span class="eyebrow">STAFF ACCESS DISABLED</span>
        <h1>Your staff account is inactive</h1>
        <p>
          Your access was disabled by the business owner. Your account
          information remains stored, but you cannot access the business until
          the owner reactivates it. Please contact your business owner for
          assistance.
        </p>
        <button
          class="btn btn-primary btn-block"
          type="button"
          @click="backToLogin"
        >
          Back to login
        </button>
      </template>
      <template v-else>
        <span class="eyebrow">BUSINESS ACCESS DISABLED</span>
        <h1>This business account is inactive</h1>
        <p v-if="auth.isOwner">
          Your business was disabled by the platform administrator. Your plan
          information and business data remain stored, but access is paused.
          Contact Vehicle Hub support for assistance.
        </p>
        <p v-else>
          This business was disabled by the platform administrator. Owner and
          staff access is currently paused. Please notify your business owner.
        </p>
        <button
          v-if="auth.isOwner"
          class="btn btn-primary btn-block"
          type="button"
          @click="supportOpen = true"
        >
          Contact support
        </button>
      </template>
      <button
        v-if="auth.isImpersonating"
        class="btn btn-block"
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
