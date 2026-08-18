<script setup lang="ts">
import { X } from "lucide-vue-next";
import { formatCurrency, formatDate } from "../../../utils";
import { prettyRecordValue } from "../../../utils/vehicles/vehicleRecordTable";

defineProps<{
  maintenance: any | null;
}>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div v-if="maintenance" class="modal-backdrop" @click.self="emit('close')">
    <section class="modal maintenance-detail-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h2>Maintenance record #{{ maintenance.id }}</h2>
          <p>Complete service and cost information</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Close" @click="emit('close')">
          <X />
        </button>
      </div>

      <dl class="maintenance-detail-list">
        <div><dt>Maintenance type</dt><dd>{{ maintenance.maintenance_type }}</dd></div>
        <div><dt>Status</dt><dd>{{ prettyRecordValue(maintenance.status) }}</dd></div>
        <div><dt>Service date</dt><dd>{{ formatDate(maintenance.service_date) }}</dd></div>
        <div><dt>Mileage</dt><dd>{{ Number(maintenance.mileage).toLocaleString() }} km</dd></div>
        <div><dt>Performed by</dt><dd>{{ maintenance.performer?.name || "—" }}</dd></div>
        <div><dt>Service provider</dt><dd>{{ maintenance.service_provider || "Not specified" }}</dd></div>
        <div>
          <dt>Maintenance schedule</dt>
          <dd>{{ maintenance.maintenance_schedule?.maintenance_type || "Unscheduled maintenance" }}</dd>
        </div>
        <div><dt>Next service date</dt><dd>{{ formatDate(maintenance.next_service_date) }}</dd></div>
        <div>
          <dt>Next service mileage</dt>
          <dd>
            {{
              maintenance.next_service_mileage
                ? `${Number(maintenance.next_service_mileage).toLocaleString()} km`
                : "—"
            }}
          </dd>
        </div>
        <div><dt>Labor cost</dt><dd>{{ formatCurrency(maintenance.labor_cost) }}</dd></div>
        <div><dt>Parts cost</dt><dd>{{ formatCurrency(maintenance.parts_cost) }}</dd></div>
        <div><dt>Other cost</dt><dd>{{ formatCurrency(maintenance.other_cost) }}</dd></div>
        <div class="maintenance-total">
          <dt>Total cost</dt>
          <dd>{{ formatCurrency(maintenance.total_cost) }}</dd>
        </div>
        <div class="full"><dt>Description</dt><dd>{{ maintenance.description || "—" }}</dd></div>
        <div class="full"><dt>Notes</dt><dd>{{ maintenance.notes || "—" }}</dd></div>
      </dl>

      <div v-if="maintenance.parts?.length" class="maintenance-parts">
        <h3>Parts used</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Part</th>
                <th>Part number</th>
                <th>Quantity</th>
                <th>Unit cost</th>
                <th>Total</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="part in maintenance.parts" :key="part.id">
                <td>{{ part.part_name }}</td>
                <td>{{ part.part_number || "—" }}</td>
                <td>{{ part.quantity }}</td>
                <td>{{ formatCurrency(part.unit_cost) }}</td>
                <td>{{ formatCurrency(part.total_cost) }}</td>
                <td>{{ part.supplier || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn" @click="emit('close')">Close</button>
      </div>
    </section>
  </div>
</template>
