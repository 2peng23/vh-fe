<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Download, ReceiptText, TrendingUp } from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import { formatDate } from "../utils/date";
import { useAuthStore } from "../stores/auth";
const auth = useAuthStore();
const report = ref<any>({ rows: [], summary: [] }),
  loading = ref(true),
  error = ref(""),
  filters = reactive({
    from: localDate(new Date(new Date().getFullYear(), 0, 1)),
    to: localDate(new Date()),
    category: "",
  });
function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<ApiEnvelope<any>>("/reports/expenses", {
      params: filters,
    });
    report.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function csv() {
  const response = await api.get("/reports/expenses", {
    params: { ...filters, format: "csv" },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vehicle-expenses.csv";
  link.click();
  URL.revokeObjectURL(url);
}
onMounted(load);
</script>
<template>
  <div>
    <PageHeader
      title="Reports"
      description="Understand vehicle spending and export business-ready reports."
      ><button v-if="auth.can('reports.export')" class="btn" @click="csv">
        <Download />Export CSV
      </button></PageHeader
    >
    <div class="toolbar report-filters">
      <label>From<input v-model="filters.from" type="date" /></label
      ><label>To<input v-model="filters.to" type="date" /></label
      ><label
        >Category<select v-model="filters.category">
          <option value="">All categories</option>
          <option>Fuel</option>
          <option>Maintenance</option>
          <option>Repair</option>
          <option>Insurance</option>
          <option>Registration</option>
        </select></label
      ><button class="btn btn-primary" @click="load">Apply filters</button>
    </div>
    <div class="alert error" v-if="error">{{ error }}</div>
    <LoadingState v-if="loading" /><template v-else
      ><div class="report-summary">
        <div v-for="x in report.summary" :key="x.category" class="metric-card">
          <span class="metric-icon blue"><ReceiptText /></span>
          <div>
            <small>{{ x.category }}</small
            ><strong>{{ money.format(+x.total) }}</strong>
          </div>
        </div>
        <div class="metric-card">
          <span class="metric-icon amber"><TrendingUp /></span>
          <div>
            <small>TOTAL COST</small
            ><strong>{{
              money.format(
                report.summary.reduce((a: number, x: any) => a + +x.total, 0),
              )
            }}</strong>
          </div>
        </div>
      </div>
      <div class="card table-card">
        <div class="card-head">
          <div>
            <h2>Expense detail</h2>
            <p>{{ report.rows.length }} records in this period</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in report.rows" :key="r.id">
                <td>{{ formatDate(r.expense_date) }}</td>
                <td>
                  {{ r.vehicle?.plate_number || `#${r.vehicle_id}` }}
                </td>
                <td>{{ r.category }}</td>
                <td>{{ r.vendor || "—" }}</td>
                <td>{{ r.description || "—" }}</td>
                <td>
                  <strong>{{ money.format(+r.amount) }}</strong>
                </td>
              </tr>
              <tr v-if="!report.rows.length">
                <td colspan="6" class="empty-cell">
                  No expenses found for this period.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div></template
    >
  </div>
</template>
