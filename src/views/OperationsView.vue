<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Wrench } from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import StatusBadge from "../components/StatusBadge.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDate } from "../utils";
import { useAuthStore } from "../stores/auth";

type Operation = "maintenance" | "issues" | "documents";
const props = defineProps<{ operation: Operation }>();
const route = useRoute();
const auth = useAuthStore();
const rows = ref<any[]>([]),
  meta = ref<PaginationMeta>(),
  loading = ref(true),
  error = ref(""),
  page = ref(1),
  perPage = ref(20);
const filter = ref(String(route.query.filter || defaultFilter()));
const config = computed(
  () =>
    ({
      maintenance: {
        title: "Maintenance",
        description:
          "Upcoming and overdue preventive maintenance across the vehicle.",
        filters: [
          ["all", "All schedules"],
          ["upcoming", "Upcoming"],
          ["overdue", "Overdue"],
        ],
      },
      issues: {
        title: "Vehicle issues",
        description:
          "Review reported issues and repair progress across all vehicles.",
        filters: [
          ["open", "Open issues"],
          ["all", "All issues"],
        ],
      },
      documents: {
        title: "Vehicle documents",
        description:
          "Track registrations, insurance policies, and upcoming renewals.",
        filters: [
          ["expiring", "Expiring soon"],
          ["expired", "Expired"],
          ["all", "All documents"],
        ],
      },
    })[props.operation],
);
function defaultFilter() {
  return props.operation === "issues"
    ? "open"
    : props.operation === "documents"
      ? "expiring"
      : "all";
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<any[]>>(`/${props.operation}`, {
      params: {
        filter: filter.value,
        page: page.value,
        per_page: perPage.value,
      },
    });
    rows.value = data.data;
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function vehicleName(row: any) {
  return row.vehicle
    ? `${row.vehicle.brand} ${row.vehicle.model}`
    : `Vehicle #${row.vehicle_id}`;
}
watch(filter, () => {
  page.value = 1;
  load();
});
watch(page, load);
watch(perPage, () => {
  page.value = 1;
  load();
});
watch(
  () => props.operation,
  () => {
    filter.value = defaultFilter();
    page.value = 1;
    load();
  },
);
onMounted(load);
</script>
<template>
  <div>
    <PageHeader :title="config.title" :description="config.description" />
    <div class="toolbar operation-toolbar">
      <button
        v-for="option in config.filters"
        :key="option[0]"
        :class="['filter-chip', { active: filter === option[0] }]"
        @click="filter = option[0]"
      >
        {{ option[1] }}
      </button>
    </div>
    <div v-if="error" class="alert error">{{ error }}</div>
    <LoadingState v-if="loading" /><EmptyState
      v-else-if="!rows.length"
      :title="`No ${config.title.toLowerCase()} found`"
      message="There are no records matching the selected filter."
    />
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table v-if="operation === 'maintenance'">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Maintenance type</th>
              <th>Current mileage</th>
              <th>Next mileage</th>
              <th>Next date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <RouterLink
                  class="operation-vehicle-link"
                  :to="`/vehicles/${row.vehicle_id}`"
                  title="Open the vehicle details"
                >
                  <strong>{{ vehicleName(row) }}</strong>
                  <small class="cell-small mono">{{
                    row.vehicle?.plate_number
                  }}</small>
                </RouterLink>
              </td>
              <td>{{ row.maintenance_type }}</td>
              <td>
                {{
                  row.vehicle?.current_mileage !== null &&
                  row.vehicle?.current_mileage !== undefined
                    ? Number(row.vehicle.current_mileage).toLocaleString() +
                      " km"
                    : "—"
                }}
              </td>
              <td>
                {{
                  row.next_service_mileage
                    ? Number(row.next_service_mileage).toLocaleString() + " km"
                    : "—"
                }}
              </td>
              <td>{{ formatDate(row.next_service_date) }}</td>
              <td><StatusBadge :status="row.due_status" /></td>
              <td>
                <div class="operation-actions">
                  <RouterLink
                    v-if="auth.can('maintenance.create')"
                    class="operation-record-link"
                    :to="`/vehicles/${row.vehicle_id}?tab=maintenance&schedule=${row.id}`"
                    title="Add a completed maintenance record for this schedule"
                  >
                    <Wrench aria-hidden="true" />
                    Record maintenance
                  </RouterLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else-if="operation === 'issues'">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Issue</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Reported</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <strong>{{ vehicleName(row) }}</strong
                ><small class="cell-small mono">{{
                  row.vehicle?.plate_number
                }}</small>
              </td>
              <td>
                <strong>{{ row.title }}</strong
                ><small class="cell-small">{{ row.description }}</small>
              </td>
              <td>{{ row.category }}</td>
              <td><StatusBadge :status="row.priority" /></td>
              <td><StatusBadge :status="row.status" /></td>
              <td>{{ formatDate(row.reported_at) }}</td>
              <td>
                <RouterLink :to="`/vehicles/${row.vehicle_id}`"
                  >View vehicle</RouterLink
                >
              </td>
            </tr>
          </tbody>
        </table>
        <table v-else>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Document</th>
              <th>Number</th>
              <th>Expiration</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <strong>{{ vehicleName(row) }}</strong
                ><small class="cell-small mono">{{
                  row.vehicle?.plate_number
                }}</small>
              </td>
              <td>{{ row.document_type }}</td>
              <td class="mono">{{ row.document_number || "—" }}</td>
              <td>{{ formatDate(row.expiration_date) }}</td>
              <td>
                <StatusBadge
                  :status="
                    new Date(row.expiration_date) < new Date()
                      ? 'expired'
                      : 'upcoming'
                  "
                />
              </td>
              <td>
                <RouterLink :to="`/vehicles/${row.vehicle_id}`"
                  >View vehicle</RouterLink
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationControls
        v-if="meta"
        :meta="meta"
        v-model:page="page"
        v-model:per-page="perPage"
      />
    </div>
  </div>
</template>
