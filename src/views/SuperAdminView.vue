<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Plus } from "lucide-vue-next";
import { useRouter } from "vue-router";
import api from "../api/client";
import { useAuthStore } from "../stores/auth";
import type { ApiEnvelope } from "../types";
import type { AdminBusiness, AdminTab } from "../types/admin";
import type { SupportConversation } from "../types/support";
import AdminPageHeading from "../components/admin/superadmin/AdminPageHeading.vue";
import BusinessesSection from "../components/admin/superadmin/BusinessesSection.vue";
import DashboardSection from "../components/admin/superadmin/DashboardSection.vue";
import PaymentMethodsSection from "../components/admin/superadmin/PaymentMethodsSection.vue";
import PermissionsSection from "../components/admin/superadmin/PermissionsSection.vue";
import PlansSection from "../components/admin/superadmin/PlansSection.vue";
import SuperAdminSidebar from "../components/admin/superadmin/SuperAdminSidebar.vue";
import SuperAdminTopbar from "../components/admin/superadmin/SuperAdminTopbar.vue";
import SupportSection from "../components/admin/superadmin/SupportSection.vue";
import TransactionsSection from "../components/admin/superadmin/TransactionsSection.vue";
import UsersSection from "../components/admin/superadmin/UsersSection.vue";
import { ADMIN_PAGE_META } from "../components/admin/superadmin/admin-config";

type BusinessesSectionExpose = { openCreateOwner: () => void };

const auth = useAuthStore();
const router = useRouter();
const tab = ref<AdminTab>("dashboard");
const sidebarOpen = ref(false);
const supportUnreadTotal = ref(0);
const businessSearch = ref("");
const permissionUserId = ref<number | null>(null);
const supportBusiness = ref<AdminBusiness | null>(null);
const businessesSection = ref<BusinessesSectionExpose | null>(null);
let supportUnreadTimer: number | undefined;

const page = computed(() => ADMIN_PAGE_META[tab.value]);

function selectTab(nextTab: AdminTab) {
  tab.value = nextTab;
  sidebarOpen.value = false;

  // Clear cross-tab navigation context when the user navigates directly.
  businessSearch.value = "";
  permissionUserId.value = null;
  supportBusiness.value = null;
}

function openBusiness(business: AdminBusiness) {
  if (!business?.name) return;
  businessSearch.value = business.name;
  permissionUserId.value = null;
  supportBusiness.value = null;
  tab.value = "businesses";
  sidebarOpen.value = false;
}

function openBusinessSupport(business: AdminBusiness) {
  businessSearch.value = "";
  permissionUserId.value = null;
  supportBusiness.value = business;
  tab.value = "support";
  sidebarOpen.value = false;
}

function openUserPermissions(userId: number) {
  businessSearch.value = "";
  supportBusiness.value = null;
  permissionUserId.value = userId;
  tab.value = "permissions";
  sidebarOpen.value = false;
}

async function logout() {
  await auth.logout();
  await router.push("/");
}

async function loadSupportUnreadTotal() {
  if (tab.value === "support") return;
  try {
    const { data } = await api.get<ApiEnvelope<SupportConversation[]>>("/superadmin/support/conversations");
    supportUnreadTotal.value = data.data.reduce(
      (total, conversation) => total + Number(conversation.unread_support_count || 0),
      0,
    );
  } catch {
    // A badge refresh should never break the rest of the admin workspace.
  }
}

onMounted(() => {
  loadSupportUnreadTotal();
  supportUnreadTimer = window.setInterval(loadSupportUnreadTotal, 2000);
});

onBeforeUnmount(() => {
  if (supportUnreadTimer) clearInterval(supportUnreadTimer);
});
</script>

<template>
  <div class="superadmin-shell">
    <SuperAdminSidebar
      :open="sidebarOpen"
      :active-tab="tab"
      :user-name="auth.user?.name"
      :support-unread-total="supportUnreadTotal"
      @navigate="selectTab"
      @close="sidebarOpen = false"
      @logout="logout"
    />

    <button
      v-if="sidebarOpen"
      class="superadmin-sidebar-overlay"
      aria-label="Close navigation"
      @click="sidebarOpen = false"
    />

    <section class="superadmin-workspace">
      <SuperAdminTopbar
        :title="page.title"
        :user-name="auth.user?.name"
        @open-menu="sidebarOpen = true"
        @logout="logout"
      />

      <main class="superadmin-content">
        <AdminPageHeading :title="page.title" :description="page.description">
          <template #actions>
            <button
              v-if="tab === 'businesses'"
              class="btn btn-primary"
              @click="businessesSection?.openCreateOwner()"
            >
              <Plus /> Add business
            </button>
          </template>
        </AdminPageHeading>

        <DashboardSection v-if="tab === 'dashboard'" @navigate="selectTab" />

        <BusinessesSection
          v-else-if="tab === 'businesses'"
          ref="businessesSection"
          :initial-search="businessSearch"
          @open-support="openBusinessSupport"
        />

        <UsersSection
          v-else-if="tab === 'users'"
          @open-business="openBusiness"
          @open-permissions="openUserPermissions"
        />

        <PermissionsSection
          v-else-if="tab === 'permissions'"
          :initial-user-id="permissionUserId"
        />

        <TransactionsSection
          v-else-if="tab === 'transactions'"
          @open-business="openBusiness"
        />

        <PlansSection v-else-if="tab === 'plans'" />

        <PaymentMethodsSection v-else-if="tab === 'payment-methods'" />

        <SupportSection
          v-else-if="tab === 'support'"
          :initial-business="supportBusiness"
          @open-business="openBusiness"
          @unread-count="supportUnreadTotal = $event"
        />
      </main>
    </section>
  </div>
</template>
