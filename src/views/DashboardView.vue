<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { RouterLink } from "vue-router";
import {
  CarFront,
  Wrench,
  TriangleAlert,
  FileClock,
  ArrowUpRight,
  Plus,
  TrendingUp,
} from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, Vehicle } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { useAuthStore } from "../stores/auth";
type Dashboard = {
  vehicles: { total: number; active: number; maintenance: number };
  issues: { open: number; critical: number };
  maintenance: { upcoming: number; overdue: number };
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
  auth = useAuthStore();
const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const maxExpense = computed(() =>
  Math.max(...(data.value?.expenses.by_category.map((x) => +x.total) || [1])),
);
onMounted(async () => {
  try {
    await auth.fetchMe();
    const d = await api.get<ApiEnvelope<Dashboard>>("/dashboard");
    data.value = d.data.data;
    if (auth.can("vehicles.view")) {
      const v = await api.get<ApiEnvelope<Vehicle[]>>("/vehicles?per_page=5");
      vehicles.value = v.data.data;
    }
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
});
</script>
<template>
  <div>
    <PageHeader
      :title="`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${auth.user?.name?.split(' ')[0] || ''}`"
      description="Here’s what needs your attention across the vehicle."
      ><RouterLink v-if="auth.can('vehicles.create')" class="btn btn-primary" to="/vehicles"
        ><Plus :size="17" /> Add vehicle</RouterLink
      ></PageHeader
    >
    <div class="alert error" v-if="error">{{ error }}</div>
    <LoadingState v-if="loading" /><template v-else-if="data"
      ><div class="metric-grid">
        <RouterLink v-if="auth.can('vehicles.view')" to="/vehicles" class="metric-card metric-link">
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
          v-if="auth.can('maintenance.view')"
          to="/maintenance?filter=upcoming"
          class="metric-card metric-link"
        >
          <span class="metric-icon amber"><Wrench /></span>
          <div>
            <small>MAINTENANCE</small
            ><strong>{{ data.maintenance.upcoming }}</strong>
            <p>
              <b>{{ data.maintenance.overdue }}</b> overdue
            </p>
          </div>
        </RouterLink>
        <RouterLink v-if="auth.can('issues.view')" to="/issues?filter=open" class="metric-card metric-link">
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
                <tr v-for="v in vehicles" :key="v.id">
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
                    <RouterLink :to="`/vehicles/${v.id}`">View</RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section v-if="auth.can('reports.view')" class="card">
          <div class="card-head">
            <div>
              <h2>Vehicle spending</h2>
              <p>This year by category</p>
            </div>
            <TrendingUp :size="20" />
          </div>
          <strong class="money-total">{{
            currency.format(data.expenses.year)
          }}</strong>
          <p class="muted">
            {{ currency.format(data.expenses.month) }} this month
          </p>
          <div class="expense-bars">
            <div v-for="x in data.expenses.by_category" :key="x.category">
              <div>
                <span>{{ x.category }}</span
                ><strong>{{ currency.format(+x.total) }}</strong>
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
        </section>
      </div></template
    >
  </div>
</template>
