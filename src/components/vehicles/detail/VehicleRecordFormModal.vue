<script setup lang="ts">
import { CircleHelp, X } from "lucide-vue-next";
import { formatDate } from "../../../utils";
import {
  fieldHelp,
  fieldLabel,
  issueCategories,
} from "../../../views/vehicles/vehicleRecordForm.config";

defineProps<{
  open: boolean;
  resource: string;
  form: Record<string, any>;
  editingRow: any | null;
  saving: boolean;
  vehicleName: string;
  maintenanceSchedules: any[];
  mileageOverride: boolean;
  canOverrideMileage: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  selectMaintenanceSchedule: [];
  selectDocumentFile: [event: Event];
  selectMileagePhoto: [event: Event];
  "update:mileageOverride": [value: boolean];
}>();

function onMileageOverrideChange(event: Event) {
  const target = event.target as HTMLInputElement;

  emit("update:mileageOverride", target.checked);
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <form class="modal small-modal" @submit.prevent="emit('save')">
      <!-- Header -->
      <div class="modal-head">
        <div>
          <h2>
            {{ editingRow ? "Edit" : "Add" }}
            {{ resource }}
            record
          </h2>

          <p>
            {{ editingRow ? "Update" : "Save" }}
            this record for
            {{ vehicleName }}.
          </p>
        </div>

        <button
          type="button"
          class="icon-btn"
          aria-label="Close"
          @click="emit('close')"
        >
          <X />
        </button>
      </div>

      <!-- Dynamic fields -->
      <div class="dynamic-form">
        <label
          v-for="(_, key) in form"
          :key="key"
          v-show="
            key !== 'custom_category' ||
            (resource === 'issues' && form.category === 'Other')
          "
          :class="{
            full: ['notes', 'description'].includes(String(key)),
          }"
        >
          <span class="dynamic-field-label">
            {{ fieldLabel(key) }}

            <button
              v-if="fieldHelp(resource, key)"
              type="button"
              class="field-help-button"
              :aria-label="`Explain ${fieldLabel(key)}`"
              :aria-describedby="`field-help-${String(key)}`"
            >
              <CircleHelp />

              <span
                :id="`field-help-${String(key)}`"
                class="field-help-tooltip"
                role="tooltip"
              >
                {{ fieldHelp(resource, key) }}
              </span>
            </button>
          </span>

          <!-- Maintenance schedule -->
          <select
            v-if="
              resource === 'maintenance' && key === 'maintenance_schedule_id'
            "
            v-model="form[key]"
            @change="emit('selectMaintenanceSchedule')"
          >
            <option value="">Unscheduled maintenance</option>

            <option
              v-for="schedule in maintenanceSchedules"
              :key="schedule.id"
              :value="schedule.id"
            >
              {{ schedule.maintenance_type }}

              <template v-if="schedule.next_service_mileage">
                —
                {{ Number(schedule.next_service_mileage).toLocaleString() }}
                km
              </template>

              <template v-else-if="schedule.next_service_date">
                —
                {{ formatDate(schedule.next_service_date) }}
              </template>
            </option>
          </select>

          <!-- Textarea -->
          <textarea
            v-else-if="['notes', 'description'].includes(String(key))"
            v-model="form[key]"
          ></textarea>

          <!-- Schedule interval -->
          <select
            v-else-if="resource === 'schedules' && key === 'interval_type'"
            v-model="form[key]"
          >
            <option value="mileage">Mileage</option>

            <option value="date">Date</option>

            <option value="both">Both</option>
          </select>

          <!-- Issue category -->
          <select
            v-else-if="resource === 'issues' && key === 'category'"
            v-model="form[key]"
          >
            <option
              v-for="category in issueCategories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>

          <!-- Priority -->
          <select v-else-if="key === 'priority'" v-model="form[key]">
            <option value="low">low</option>

            <option value="medium">medium</option>

            <option value="high">high</option>

            <option value="critical">critical</option>
          </select>

          <!-- Standard input -->
          <input
            v-else
            v-model="form[key]"
            :required="
              resource === 'issues' &&
              key === 'custom_category' &&
              form.category === 'Other'
            "
            :placeholder="
              key === 'custom_category' ? 'Enter a custom issue category' : ''
            "
            :type="
              String(key).includes('date')
                ? 'date'
                : typeof form[key] === 'number'
                  ? 'number'
                  : 'text'
            "
          />

          <!-- Empty maintenance schedules -->
          <small
            v-if="
              resource === 'maintenance' &&
              key === 'maintenance_schedule_id' &&
              !maintenanceSchedules.length
            "
            class="field-empty-help"
          >
            No schedules available. Create one in the Maintenance Schedule tab,
            or save this as unscheduled maintenance.
          </small>
        </label>

        <!-- Document attachment -->
        <label v-if="resource === 'documents'" class="file-picker">
          <span class="dynamic-field-label">
            Attachment

            <button
              type="button"
              class="field-help-button"
              aria-label="Explain attachment"
              aria-describedby="document-attachment-help"
            >
              <CircleHelp />

              <span
                id="document-attachment-help"
                class="field-help-tooltip"
                role="tooltip"
              >
                Upload a PDF, JPG, or PNG copy of the vehicle document for
                secure storage.
              </span>
            </button>
          </span>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            @change="emit('selectDocumentFile', $event)"
          />

          <small> PDF, JPG or PNG up to 10 MB </small>
        </label>

        <!-- Mileage odometer photo -->
        <label v-if="resource === 'mileage'" class="file-picker">
          <span class="dynamic-field-label">
            {{ fieldLabel("odometer_photo") }}

            <button
              v-if="fieldHelp(resource, 'odometer_photo')"
              type="button"
              class="field-help-button"
              :aria-label="`Explain ${fieldLabel('odometer_photo')}`"
              aria-describedby="odometer-photo-help"
            >
              <CircleHelp />

              <span
                id="odometer-photo-help"
                class="field-help-tooltip"
                role="tooltip"
              >
                {{ fieldHelp(resource, "odometer_photo") }}
              </span>
            </button>
          </span>

          <!-- No image preview -->

          <input
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            capture="environment"
            @change="emit('selectMileagePhoto', $event)"
          />

          <small> JPG or PNG up to 10 MB </small>
        </label>

        <!-- Mileage override -->
        <label
          v-if="resource === 'mileage' && canOverrideMileage"
          class="mileage-override"
        >
          <span>
            <input
              :checked="mileageOverride"
              type="checkbox"
              :disabled="Boolean(editingRow?.is_override)"
              @change="onMileageOverrideChange"
            />

            {{ fieldLabel("mileage_override") }}

            <button
              v-if="fieldHelp(resource, 'mileage_override')"
              type="button"
              class="field-help-button"
              :aria-label="`Explain ${fieldLabel('mileage_override')}`"
              aria-describedby="mileage-override-help"
            >
              <CircleHelp />

              <span
                id="mileage-override-help"
                class="field-help-tooltip"
                role="tooltip"
              >
                {{ fieldHelp(resource, "mileage_override") }}
              </span>
            </button>
          </span>

          <small>
            Use only for an odometer replacement or a verified correction. This
            action is recorded in the audit log.
          </small>
        </label>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button type="button" class="btn" @click="emit('close')">Cancel</button>

        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? "Saving…" : editingRow ? "Save changes" : "Save record" }}
        </button>
      </div>
    </form>
  </div>
</template>
