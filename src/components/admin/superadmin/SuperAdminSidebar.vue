<script setup lang="ts">
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-vue-next";
import AppLogo from "../../AppLogo.vue";
import type { AdminTab } from "../../../types/admin";

interface Props {
  open: boolean;
  activeTab: AdminTab;
  userName?: string;
  supportUnreadTotal?: number;
}

withDefaults(defineProps<Props>(), {
  userName: "",
  supportUnreadTotal: 0,
});

const emit = defineEmits<{
  navigate: [tab: AdminTab];
  close: [];
  logout: [];
}>();

const navigation: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "users", label: "All users", icon: Users },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "plans", label: "Plans", icon: ShieldCheck },
  { id: "payment-methods", label: "Payment methods", icon: QrCode },
  { id: "support", label: "Support", icon: MessageCircle },
];
</script>

<template>
  <aside class="superadmin-sidebar" :class="{ open }">
    <div class="superadmin-sidebar-brand">
      <AppLogo theme="dark" />
      <button class="icon-btn superadmin-sidebar-close" aria-label="Close navigation" @click="emit('close')">
        <X />
      </button>
    </div>

    <nav class="superadmin-navigation" aria-label="Super administrator navigation">
      <small>Platform</small>
      <button
        v-for="item in navigation"
        :key="item.id"
        type="button"
        :class="{ active: activeTab === item.id }"
        @click="emit('navigate', item.id)"
      >
        <component :is="item.icon" />
        <span>{{ item.label }}</span>
        <em v-if="item.id === 'support' && supportUnreadTotal" class="superadmin-nav-count">
          {{ supportUnreadTotal > 99 ? "99+" : supportUnreadTotal }}
        </em>
      </button>
    </nav>

    <div class="superadmin-sidebar-account">
      <span><ShieldCheck /> Platform administration</span>
      <strong>{{ userName }}</strong>
      <button type="button" @click="emit('logout')"><LogOut /> Sign out</button>
    </div>
  </aside>
</template>
