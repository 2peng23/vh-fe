<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import {
  CarFront,
  Wrench,
  TriangleAlert,
  FileClock,
  ArrowUpRight,
  TrendingUp,
  LifeBuoy,
  UserRoundCheck,
} from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, Vehicle } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { useAuthStore } from "../stores/auth";
import AppLogo from "../components/AppLogo.vue";
import SupportChatView from "./SupportChatView.vue";
import { formatCurrency } from "../utils";
type Dashboard = {
  vehicles: { total: number; active: number; maintenance: number };
  assignments: { total: number; active: number };
  issues: { open: number; critical: number };
  maintenance: { total: number; upcoming: number; overdue: number };
  documents: { expiring: number; expired: number };
  expenses: {
    month: number;
    year: number;
    by_category: { category: string; total: string }[];
  };
};
const data = ref<Dashboard | null>(null),
  vehicles = ref<Vehicle[]>([]),
  loading = ref(true),
  error = ref(""),
  supportOpen = ref(false),
  auth = useAuthStore();
const router = useRouter();
const maxExpense = computed(() =>
  Math.max(...(data.value?.expenses.by_category.map((x) => +x.total) || [1])),
);
onMounted(async () => {
  try {
    if (auth.accessRestricted) return;
    await auth.fetchMe();
    const dashboardResponse =
      await api.get<ApiEnvelope<Dashboard>>("/dashboard");
    data.value = dashboardResponse.data.data;
    if (auth.can("vehicles.view")) {
      const vehiclesResponse =
        await api.get<ApiEnvelope<Vehicle[]>>("/vehicles?per_page=5");
      vehicles.value = vehiclesResponse.data.data;
    }
  } catch (errorResponse) {
    error.value = errorMessage(errorResponse);
  } finally {
    loading.value = false;
  }
});
</script>
<template>
  <div>
    <div v-if="auth.planEnded" class="dashboard-plan-ended">
      <section class="plan-ended-content">
        <AppLogo />
        <div class="plan-ended-icon"><LifeBuoy /></div>
        <span class="eyebrow">ACCOUNT ACCESS PAUSED</span>
        <h1>Your plan has ended</h1>
        <p v-if="auth.isOwner">
          Access for the owner and all staff accounts is currently disabled.
          Purchase a plan to reactivate your account.
        </p>
        <p v-else>
          Your business plan has ended and access is currently disabled. Please
          notify your business owner. Only the owner can contact Vehicle Hub
          support and manage the renewal.
        </p>
        <button
          v-if="auth.isOwner"
          class="btn btn-primary btn-block"
          type="button"
          @click="router.push('/plan-transactions?purchase=1')"
        >
          Purchase plan
        </button>
      </section>
      <div
        v-if="supportOpen"
        class="modal-backdrop support-modal-backdrop"
        @click.self="supportOpen = false"
      >
        <SupportChatView embedded @close="supportOpen = false" />
      </div>
    </div>
    <section
      v-else-if="auth.businessInactive"
      class="restricted-dashboard-card"
    >
      <span class="eyebrow">BUSINESS ACCESS DISABLED</span>
      <h1>This business account is inactive</h1>
      <p v-if="auth.isOwner">
        Your business was disabled by the platform administrator. Use Support in
        the sidebar to request assistance.
      </p>
      <p v-else>
        Owner and staff access is currently paused. Please notify your business
        owner.
      </p>
    </section>
    <template v-else>
      <PageHeader
        :title="`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${auth.user?.name?.split(' ')[0] || ''}`"
        description="Here’s what needs your attention across the vehicle."
      />
      <div class="alert error" v-if="error">{{ error }}</div>
      <LoadingState v-if="loading" /><template v-else-if="data"
        ><div class="metric-grid">
          <RouterLink
            v-if="auth.can('vehicles.view')"
            to="/vehicles"
            class="metric-card metric-link"
          >
            <span class="metric-icon blue"><CarFront /></span>
            <div>
              <small>TOTAL VEHICLES</small
              ><strong>{{ data.vehicles.total }}</strong>
              <p>
                <b>{{ data.vehicles.active }}</b> active in vehicle
              </p>
            </div>
          </RouterLink>
          <RouterLink
            v-if="auth.can('assignments.view')"
            to="/assignments"
            class="metric-card metric-link"
          >
            <span class="metric-icon teal"><UserRoundCheck /></span>
            <div>
              <small>ASSIGNMENTS</small><strong>{{ data.assignments.total }}</strong>
              <p><b>{{ data.assignments.active }}</b> currently active</p>
            </div>
          </RouterLink>
          <RouterLink
            v-if="auth.can('maintenance.view')"
            to="/maintenance?filter=all"
            class="metric-card metric-link"
          >
            <span class="metric-icon amber"><Wrench /></span>
            <div>
              <small>MAINTENANCE</small
              ><strong>{{ data.maintenance.total }}</strong>
              <p>
                <b>{{ data.maintenance.upcoming }}</b> upcoming ·
                <b>{{ data.maintenance.overdue }}</b> overdue
              </p>
            </div>
          </RouterLink>
          <RouterLink
            v-if="auth.can('issues.view')"
            to="/issues?filter=open"
            class="metric-card metric-link"
          >
            <span class="metric-icon red"><TriangleAlert /></span>
            <div>
              <small>OPEN ISSUES</small><strong>{{ data.issues.open }}</strong>
              <p>
                <b>{{ data.issues.critical }}</b> critical priority
              </p>
            </div>
          </RouterLink>
          <RouterLink
            v-if="auth.can('documents.view')"
            to="/documents?filter=expiring"
            class="metric-card metric-link"
          >
            <span class="metric-icon violet"><FileClock /></span>
            <div>
              <small>EXPIRING SOON</small
              ><strong>{{ data.documents.expiring }}</strong>
              <p>
                <b>{{ data.documents.expired }}</b> already expired
              </p>
            </div>
          </RouterLink>
        </div>
        <div class="dashboard-grid">
          <section v-if="auth.can('vehicles.view')" class="card span-2">
            <div class="card-head">
              <div>
                <h2>Vehicle overview</h2>
                <p>Current status of your vehicles</p>
              </div>
              <RouterLink to="/vehicles"
                >View all <ArrowUpRight :size="16"
              /></RouterLink>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Plate</th>
                    <th>Mileage</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="v in vehicles"
                    :key="v.id"
                    class="clickable-row"
                    role="link"
                    tabindex="0"
                    @click="router.push(`/vehicles/${v.id}`)"
                    @keydown.enter="router.push(`/vehicles/${v.id}`)"
                    @keydown.space.prevent="router.push(`/vehicles/${v.id}`)"
                  >
                    <td>
                      <div class="vehicle-cell">
                        <span><CarFront /></span>
                        <div>
                          <strong>{{ v.brand }} {{ v.model }}</strong
                          ><small>{{ v.year }} · {{ v.vehicle_type }}</small>
                        </div>
                      </div>
                    </td>
                    <td class="mono">{{ v.plate_number }}</td>
                    <td>
                      {{ Number(v.current_mileage).toLocaleString() }}
                      km
                    </td>
                    <td><StatusBadge :status="v.status" /></td>
                    <td>
                      <RouterLink :to="`/vehicles/${v.id}`" @click.stop
                        >View</RouterLink
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <RouterLink
            v-if="auth.can('reports.view')"
            class="card spending-card-link"
            :to="{ path: '/reports', query: { range: 'all' } }"
          >
            <div class="card-head">
              <div>
                <h2>Vehicle spending</h2>
                <p>This year by category</p>
              </div>
              <TrendingUp :size="20" />
            </div>
            <strong class="money-total">{{
              formatCurrency(data.expenses.year)
            }}</strong>
            <p class="muted">
              {{ formatCurrency(data.expenses.month) }} this month
            </p>
            <div class="expense-bars">
              <div v-for="x in data.expenses.by_category" :key="x.category">
                <div>
                  <span>{{ x.category }}</span
                  ><strong>{{ formatCurrency(x.total) }}</strong>
                </div>
                <i
                  ><b
                    :style="{
                      width: `${(+x.total / maxExpense) * 100}%`,
                    }"
                  ></b
                ></i>
              </div>
              <p v-if="!data.expenses.by_category.length" class="muted">
                No expenses recorded this year.
              </p>
            </div>
          </RouterLink>
        </div></template
      >
    </template>
  </div>
</template>
