<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  Building2,
  CarFront,
  ChevronRight,
  CreditCard,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-vue-next";
import api, { errorMessage } from "../../../api/client";
import type { ApiEnvelope } from "../../../types";
import type { AdminStats, AdminTab } from "../../../types/admin";
import LoadingState from "../../LoadingState.vue";

const emit = defineEmits<{ navigate: [tab: AdminTab] }>();

const stats = ref<AdminStats>({
  businesses: 0,
  active_businesses: 0,
  trial_businesses: 0,
  users: 0,
  vehicles: 0,
});
const loading = ref(true);
const error = ref("");

const quickLinks: Array<{ id: Exclude<AdminTab, "dashboard">; label: string; icon: typeof Building2 }> = [
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "users", label: "All users", icon: Users },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "plans", label: "Plans", icon: ShieldCheck },
  { id: "payment-methods", label: "Payment methods", icon: QrCode },
  { id: "support", label: "Support", icon: MessageCircle },
];

async function loadStats() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<AdminStats>>("/superadmin/dashboard");
    stats.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadStats);
</script>

<template>
  <div v-if="error" class="alert error">{{ error }}</div>
  <LoadingState v-if="loading" />
  <template v-else>
    <div class="superadmin-stats">
      <article><Building2 /><small>Businesses</small><strong>{{ stats.businesses || 0 }}</strong></article>
      <article>
        <ShieldCheck /><small>Active / Trial plans</small>
        <strong>{{ stats.active_businesses || 0 }} / {{ stats.trial_businesses || 0 }}</strong>
      </article>
      <article><Users /><small>Tenant users</small><strong>{{ stats.users || 0 }}</strong></article>
      <article><CarFront /><small>Vehicles</small><strong>{{ stats.vehicles || 0 }}</strong></article>
    </div>

    <div class="superadmin-dashboard-grid">
      <section class="card superadmin-quick-actions">
        <div>
          <span class="eyebrow">QUICK ACCESS</span>
          <h2>Manage the platform</h2>
          <p>Open a workspace to review and update platform records.</p>
        </div>
        <div class="superadmin-quick-links">
          <button v-for="item in quickLinks" :key="item.id" type="button" @click="emit('navigate', item.id)">
            <span><component :is="item.icon" /><strong>{{ item.label }}</strong></span>
            <ChevronRight />
          </button>
        </div>
      </section>

      <section class="card superadmin-plan-summary">
        <span class="eyebrow">ACCOUNT SUMMARY</span>
        <h2>Business plans</h2>
        <div><span>Active businesses</span><strong>{{ stats.active_businesses || 0 }}</strong></div>
        <div><span>Trial plans</span><strong>{{ stats.trial_businesses || 0 }}</strong></div>
        <div><span>Total businesses</span><strong>{{ stats.businesses || 0 }}</strong></div>
        <button class="btn" type="button" @click="emit('navigate', 'businesses')">View all businesses</button>
      </section>
    </div>
  </template>
</template>
