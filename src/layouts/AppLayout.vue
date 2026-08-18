<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter, RouterLink, RouterView } from "vue-router";
import {
  LayoutDashboard,
  CarFront,
  Users,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Menu,
  Search,
  ChevronDown,
  LogOut,
  Wrench,
  TriangleAlert,
  FileText,
  ScrollText,
  UserCog,
  ShieldCheck,
  MessageCircle,
  CreditCard,
  CircleUserRound,
  BadgeCheck,
} from "lucide-vue-next";
import AppLogo from "../components/AppLogo.vue";
import SupportChatView from "../views/SupportChatView.vue";
import api from "../api/client";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore(),
  router = useRouter(),
  open = ref(false),
  profileOpen = ref(false),
  supportOpen = ref(false),
  supportUnread = ref(0),
  globalSearch = ref(""),
  searchOpen = ref(false),
  searchLoading = ref(false),
  vehicleResults = ref<any[]>([]),
  driverResults = ref<any[]>([]);
const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { to: "/vehicles", label: "Vehicles", icon: CarFront, permission: "vehicles.view" },
  { to: "/drivers", label: "Drivers", icon: Users, permission: "drivers.view" },
  { to: "/assignments", label: "Assignments", icon: ArrowLeftRight, permission: "assignments.view" },
  { to: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
  { to: "/audit-logs", label: "Audit log", icon: ScrollText, permission: "audit.view" },
  { to: "/staff", label: "Staff", icon: UserCog, permission: "staff.view" },
];
const operations = [
  { to: "/maintenance", label: "Maintenance", icon: Wrench, permission: "maintenance.view" },
  { to: "/issues", label: "Issues", icon: TriangleAlert, permission: "issues.view" },
  { to: "/documents", label: "Documents", icon: FileText, permission: "documents.view" },
];
function syncAccessState() {
  auth.syncCachedUser();
}
onMounted(() => {
  window.addEventListener("vehiclehub-access-changed", syncAccessState);
  auth.fetchMe().catch(() => undefined);
});
let searchTimer: number;
let supportUnreadTimer: number;
async function loadSupportUnread() {
  if (!auth.isOwner) return;
  try {
    const { data } = await api.get("/support/unread-count");
    supportUnread.value = data.data.count || 0;
  } catch {
    supportUnread.value = 0;
  }
}
function queueSearch() {
  clearTimeout(searchTimer);
  const term = globalSearch.value.trim();
  searchOpen.value = Boolean(term);
  if (!term) {
    vehicleResults.value = [];
    driverResults.value = [];
    return;
  }
  searchTimer = window.setTimeout(runGlobalSearch, 250);
}
async function runGlobalSearch() {
  const term = globalSearch.value.trim();
  if (!term) return;
  searchLoading.value = true;
  try {
    const [vehicles, drivers] = await Promise.all([
      auth.can("vehicles.view")
        ? api.get("/vehicles", { params: { search: term, per_page: 5 } })
        : Promise.resolve(null),
      auth.can("drivers.view")
        ? api.get("/drivers", { params: { search: term, per_page: 5 } })
        : Promise.resolve(null),
    ]);
    if (term !== globalSearch.value.trim()) return;
    vehicleResults.value = vehicles?.data.data || [];
    driverResults.value = drivers?.data.data || [];
  } catch {
    vehicleResults.value = [];
    driverResults.value = [];
  } finally {
    searchLoading.value = false;
  }
}
function openVehicle(id: number) {
  searchOpen.value = false;
  globalSearch.value = "";
  router.push(`/vehicles/${id}`);
}
function openDriver(name: string) {
  searchOpen.value = false;
  globalSearch.value = "";
  router.push({ path: "/drivers", query: { search: name } });
}
onMounted(() => {
  loadSupportUnread();
  supportUnreadTimer = window.setInterval(loadSupportUnread, 2000);
});
onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  clearInterval(supportUnreadTimer);
  window.removeEventListener("vehiclehub-access-changed", syncAccessState);
});
async function logout() {
  try {
    await auth.logout();
  } finally {
    profileOpen.value = false;
    await router.replace("/");
  }
}
async function returnToSuperAdmin() {
  await auth.stopImpersonating();
  router.push("/superadmin");
}
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ open }">
      <div class="sidebar-top">
        <AppLogo theme="dark"/><button class="icon-btn mobile-only" @click="open = false">
          ×
        </button>
      </div>
      <nav>
        <p class="nav-label">Workspace</p>
        <template v-for="item in nav" :key="item.to">
          <span v-if="auth.can(item.permission) && auth.accessRestricted" class="sidebar-nav-item nav-disabled" :class="{ 'restricted-current': item.to === '/dashboard' }" aria-disabled="true"><component :is="item.icon" :size="19" /><span>{{ item.label }}</span></span>
          <RouterLink v-else-if="auth.can(item.permission)" :to="item.to" @click="open = false"><component :is="item.icon" :size="19" /><span>{{ item.label }}</span></RouterLink>
        </template>
        <p class="nav-label">Operations</p>
        <template v-for="item in operations" :key="item.to">
          <span v-if="auth.can(item.permission) && auth.accessRestricted" class="sidebar-nav-item nav-disabled" aria-disabled="true"><component :is="item.icon" :size="19" /><span>{{ item.label }}</span></span>
          <RouterLink v-else-if="auth.can(item.permission)" :to="item.to" @click="open = false"><component :is="item.icon" :size="19" /><span>{{ item.label }}</span></RouterLink>
        </template>
        <p v-if="auth.isOwner" class="nav-label">Account</p>
        <RouterLink v-if="auth.isOwner" to="/subscription" @click="open = false"><BadgeCheck :size="19" /><span>Subscription</span></RouterLink>
        <RouterLink v-if="auth.isOwner" to="/plan-transactions" @click="open = false"><CreditCard :size="19" /><span>Plan transactions</span></RouterLink>
        <button v-if="auth.isOwner" type="button" class="sidebar-support-button" :class="{ unread: supportUnread > 0 }" @click="supportOpen = true; open = false"><MessageCircle :size="19" /><span>Support</span><em v-if="supportUnread">{{ supportUnread > 99 ? '99+' : supportUnread }}</em></button>
      </nav>
      <div class="sidebar-foot">
        <div class="trial">
          <small>{{ auth.user?.business?.subscription?.label || "Starter" }} PLAN</small
          ><strong>{{ auth.user?.business?.subscription?.vehicle_count || 0 }} of {{ auth.user?.business?.subscription?.vehicle_limit || 5 }} vehicles</strong>
          <div class="plan-progress"><i :style="{ width: `${auth.user?.business?.subscription?.usage_percent || 0}%` }"></i></div>
          <span v-if="auth.user?.business?.subscription?.vehicle_limit_reached">Vehicle limit reached</span>
          <span v-else>{{ auth.user?.business?.subscription?.vehicles_remaining ?? 5 }} slots remaining</span>
        </div>
      </div>
    </aside>
    <div class="overlay" v-if="open" @click="open = false"></div>
    <main class="main">
      <header class="topbar">
        <button class="icon-btn mobile-only" @click="open = true">
          <Menu />
        </button>
        <div v-if="!auth.accessRestricted" class="top-search global-search">
          <Search :size="17" /><input
            v-model="globalSearch"
            placeholder="Search vehicles, drivers…"
            aria-label="Search vehicles and drivers"
            @input="queueSearch"
            @focus="searchOpen = !!globalSearch.trim()"
            @keydown.escape="searchOpen = false"
          />
          <div v-if="searchOpen" class="global-search-results">
            <p v-if="searchLoading" class="global-search-state">Searching…</p>
            <template v-else>
              <div v-if="vehicleResults.length" class="global-search-group">
                <small>Vehicles</small>
                <button
                  v-for="vehicle in vehicleResults"
                  :key="`vehicle-${vehicle.id}`"
                  type="button"
                  @click="openVehicle(vehicle.id)"
                >
                  <CarFront :size="17" />
                  <span><strong>{{ vehicle.brand }} {{ vehicle.model }}</strong><small>{{ vehicle.plate_number }} · {{ vehicle.vehicle_code || 'No code' }}</small></span>
                </button>
              </div>
              <div v-if="driverResults.length" class="global-search-group">
                <small>Drivers</small>
                <button
                  v-for="driver in driverResults"
                  :key="`driver-${driver.id}`"
                  type="button"
                  @click="openDriver(driver.name)"
                >
                  <Users :size="17" />
                  <span><strong>{{ driver.name }}</strong><small>{{ driver.employee_number || driver.license_number || driver.email || 'Driver' }}</small></span>
                </button>
              </div>
              <p v-if="!vehicleResults.length && !driverResults.length" class="global-search-state">No matching vehicles or drivers.</p>
            </template>
          </div>
        </div>
        <div class="top-actions">
          <button v-if="auth.isImpersonating" class="btn impersonation-return" @click="returnToSuperAdmin">
            <ShieldCheck :size="16" />Return to Super Admin
          </button>
          <RouterLink v-if="!auth.accessRestricted" to="/notifications" class="icon-btn notification"
            ><Bell :size="20" /><span></span
          ></RouterLink>
          <button v-if="auth.isOwner" type="button" class="icon-btn support-icon" :class="{ unread: supportUnread > 0 }" title="Contact support" aria-label="Open support chat" @click="supportOpen = true">
            <MessageCircle :size="20" /><span v-if="supportUnread">{{ supportUnread > 99 ? '99+' : supportUnread }}</span>
          </button>
          <div class="profile-wrap">
            <button class="profile" @click="profileOpen = !profileOpen">
              <span class="avatar">{{ auth.user?.name?.charAt(0) }}</span
              ><span class="profile-copy"
                ><strong>{{ auth.user?.name }}</strong
                ><small>{{ auth.user?.role?.replace("_", " ") }}</small></span
              ><ChevronDown :size="15" />
            </button>
            <div class="profile-menu" v-if="profileOpen">
              <RouterLink to="/profile" @click="profileOpen = false"><CircleUserRound :size="16" />Profile</RouterLink>
              <button @click="logout"><LogOut :size="16" />Sign out</button>
            </div>
          </div>
        </div>
      </header>
      <section class="content"><RouterView /></section>
    </main>
    <div v-if="supportOpen" class="modal-backdrop support-modal-backdrop" @click.self="supportOpen = false">
      <SupportChatView embedded @close="supportOpen = false" />
    </div>
  </div>
</template>
