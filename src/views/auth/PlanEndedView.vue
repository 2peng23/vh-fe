<script setup lang="ts">
import { LifeBuoy } from "lucide-vue-next";
import { ref } from "vue";
import AppLogo from "../../components/AppLogo.vue";
import { useAuthStore } from "../../stores/auth";
import SupportChatView from "../SupportChatView.vue";

const auth = useAuthStore();
const supportOpen = ref(false);
</script>

<template>
  <main class="plan-ended-page">
    <section class="plan-ended-card">
      <AppLogo />
      <div class="plan-ended-icon"><LifeBuoy /></div>
      <span class="eyebrow">ACCOUNT ACCESS PAUSED</span>
      <h1>Your plan has ended</h1>
      <p v-if="auth.isOwner">
        Access for the owner and all staff accounts is currently disabled.
        Please contact Vehicle Hub support to renew or reactivate your plan.
      </p>
      <p v-else>
        Your business plan has ended and access is currently disabled.
        Please notify your business owner. Only the owner can contact Vehicle Hub support and manage the renewal.
      </p>
      <button v-if="auth.isOwner" class="btn btn-primary btn-block" type="button" @click="supportOpen = true">Contact support</button>
    </section>
    <div v-if="supportOpen" class="modal-backdrop support-modal-backdrop" @click.self="supportOpen = false">
      <SupportChatView embedded @close="supportOpen = false" />
    </div>
  </main>
</template>
