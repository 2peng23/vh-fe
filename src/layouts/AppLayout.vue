<script setup lang="ts">
import { onMounted, ref } from "vue";
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
} from "lucide-vue-next";
import AppLogo from "../components/AppLogo.vue";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore(),
  router = useRouter(),
  open = ref(false),
  profileOpen = ref(false);
const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
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
onMounted(() => auth.fetchMe().catch(() => undefined));
async function logout() {
  await auth.logout();
  router.push("/login");
}
</script>
<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ open }">
      <div class="sidebar-top">
        <AppLogo /><button class="icon-btn mobile-only" @click="open = false">
          ×
        </button>
      </div>
      <nav>
        <p class="nav-label">Workspace</p>
        <RouterLink
          v-for="item in nav"
          v-show="auth.can(item.permission)"
          :key="item.to"
          :to="item.to"
          @click="open = false"
          ><component :is="item.icon" :size="19" /><span>{{
            item.label
          }}</span></RouterLink
        >
        <p class="nav-label">Operations</p>
        <RouterLink
          v-for="item in operations"
          v-show="auth.can(item.permission)"
          :key="item.to"
          :to="item.to"
          @click="open = false"
          ><component :is="item.icon" :size="19" /><span>{{
            item.label
          }}</span></RouterLink
        >
      </nav>
      <div class="sidebar-foot">
        <div class="trial">
          <small>TRIAL PLAN</small
          ><strong>{{
            auth.user?.business?.subscription_plan || "Starter"
          }}</strong
          ><span>Manage subscription →</span>
        </div>
      </div>
    </aside>
    <div class="overlay" v-if="open" @click="open = false"></div>
    <main class="main">
      <header class="topbar">
        <button class="icon-btn mobile-only" @click="open = true">
          <Menu />
        </button>
        <div class="top-search">
          <Search :size="17" /><input placeholder="Search vehicles, drivers…" />
        </div>
        <div class="top-actions">
          <RouterLink to="/notifications" class="icon-btn notification"
            ><Bell :size="20" /><span></span
          ></RouterLink>
          <div class="profile-wrap">
            <button class="profile" @click="profileOpen = !profileOpen">
              <span class="avatar">{{ auth.user?.name?.charAt(0) }}</span
              ><span class="profile-copy"
                ><strong>{{ auth.user?.name }}</strong
                ><small>{{ auth.user?.role?.replace("_", " ") }}</small></span
              ><ChevronDown :size="15" />
            </button>
            <div class="profile-menu" v-if="profileOpen">
              <button @click="logout"><LogOut :size="16" />Sign out</button>
            </div>
          </div>
        </div>
      </header>
      <section class="content"><RouterView /></section>
    </main>
  </div>
</template>
