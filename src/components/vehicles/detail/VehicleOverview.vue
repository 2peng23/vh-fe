<script setup lang="ts">
import { FileText, Gauge, ReceiptText, Wrench } from "lucide-vue-next";
import type { Vehicle } from "../../../types";
import EmptyState from "../../EmptyState.vue";
import { formatDate } from "../../../utils/date";

defineProps<{
  vehicle: Vehicle;
  nextMaintenanceSchedule?: any;
  remaining: number | null;
  canViewMileage: boolean;
  canViewSchedules: boolean;
  canViewDocuments: boolean;
  canViewExpenses: boolean;
  money: Intl.NumberFormat;
}>();

const emit = defineEmits<{
  selectTab: [tab: string];
}>();
</script>

<template>
  <section>
    <div class="detail-metrics">
      <button v-if="canViewMileage" type="button" @click="emit('selectTab', 'mileage')">
        <span><Gauge /></span>
        <small>CURRENT MILEAGE</small>
        <strong>{{ Number(vehicle.current_mileage).toLocaleString() }} km</strong>
      </button>

      <button v-if="canViewSchedules" type="button" @click="emit('selectTab', 'schedules')">
        <span><Wrench /></span>
        <small>NEXT MAINTENANCE SCHEDULE</small>
        <strong>
          {{
            nextMaintenanceSchedule?.next_service_mileage
              ? Number(nextMaintenanceSchedule.next_service_mileage).toLocaleString() + " km"
              : "Not scheduled"
          }}
        </strong>
        <p v-if="remaining !== null" :class="{ danger: remaining < 0 }">
          {{
            remaining < 0
              ? `${Math.abs(remaining)} km overdue`
              : `${remaining.toLocaleString()} km remaining`
          }}
        </p>
      </button>

      <button v-if="canViewDocuments" type="button" @click="emit('selectTab', 'documents')">
        <span><FileText /></span>
        <small>DOCUMENTS</small>
        <strong>{{ vehicle.documents?.length || 0 }} on file</strong>
      </button>

      <button v-if="canViewExpenses" type="button" @click="emit('selectTab', 'expenses')">
        <span><ReceiptText /></span>
        <small>EXPENSES</small>
        <strong>{{ money.format(Number(vehicle.expenses_sum_amount || 0)) }}</strong>
      </button>
    </div>

    <div class="detail-grid">
      <article class="card">
        <div class="card-head">
          <div>
            <h2>Vehicle information</h2>
            <p>Core identification and acquisition details</p>
          </div>
        </div>
        <dl class="info-list">
          <div><dt>Vehicle code</dt><dd>{{ vehicle.vehicle_code || "—" }}</dd></div>
          <div><dt>Vehicle type</dt><dd>{{ vehicle.vehicle_type }}</dd></div>
          <div><dt>Variant</dt><dd>{{ vehicle.variant || "—" }}</dd></div>
          <div><dt>Color</dt><dd>{{ vehicle.color || "—" }}</dd></div>
          <div><dt>Purchased date</dt><dd>{{ formatDate(vehicle.acquisition_date) }}</dd></div>
          <div>
            <dt>Vehicle cost</dt>
            <dd>
              {{
                vehicle.acquisition_cost
                  ? `₱${Number(vehicle.acquisition_cost).toLocaleString()}`
                  : "—"
              }}
            </dd>
          </div>
        </dl>
      </article>

      <article class="card">
        <div class="card-head">
          <div>
            <h2>Upcoming attention</h2>
            <p>Maintenance and document deadlines</p>
          </div>
        </div>
        <button
          v-if="nextMaintenanceSchedule && canViewSchedules"
          type="button"
          class="attention attention-link"
          @click="emit('selectTab', 'schedules')"
        >
          <span class="metric-icon amber"><Wrench /></span>
          <div>
            <strong>{{ nextMaintenanceSchedule.maintenance_type }}</strong>
            <p>
              {{
                nextMaintenanceSchedule.next_service_date
                  ? formatDate(nextMaintenanceSchedule.next_service_date)
                  : "Mileage based schedule"
              }}
            </p>
          </div>
        </button>
        <EmptyState
          v-else
          title="Everything looks clear"
          message="No upcoming maintenance or document deadlines."
        />
      </article>
    </div>
  </section>
</template>
