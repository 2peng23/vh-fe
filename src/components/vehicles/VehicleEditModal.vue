<script setup lang="ts">
import { X } from "lucide-vue-next";

interface CodeOption {
  prefix: string;
  label: string;
}

defineProps<{
  open: boolean;
  form: Record<string, any>;
  errors: Record<string, string[]>;
  codeOptions: CodeOption[];
  codePrefix: string;
  codeNumber: string;
  saving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  selectCodePrefix: [];
  selectVehicleType: [];
  "update:codePrefix": [value: string];
  "update:codeNumber": [value: string];
}>();
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
    <form class="modal" @submit.prevent="emit('save')">
      <div class="modal-head"><div><h2>Edit vehicle</h2><p>Update identification and vehicle information.</p></div><button type="button" class="icon-btn" @click="emit('close')"><X /></button></div>
      <div class="field-grid">
        <label>Plate number<input v-model="form.plate_number" required /><small v-if="errors.plate_number">{{ errors.plate_number[0] }}</small></label>
        <label>Vehicle code type<select :value="codePrefix" @change="emit('update:codePrefix', ($event.target as HTMLSelectElement).value); emit('selectCodePrefix')"><option value="">Custom / legacy code</option><option v-for="option in codeOptions" :key="option.prefix" :value="option.prefix">{{ option.label }}</option></select></label>
        <label>Vehicle code number<input :value="codeNumber" required maxlength="20" placeholder="Example: 0001" @input="emit('update:codeNumber', ($event.target as HTMLInputElement).value)" /><small v-if="errors.vehicle_code">{{ errors.vehicle_code[0] }}</small></label>
        <label>Brand<input v-model="form.brand" required /><small v-if="errors.brand">{{ errors.brand[0] }}</small></label>
        <label>Model<input v-model="form.model" required /><small v-if="errors.model">{{ errors.model[0] }}</small></label>
        <label>Variant<input v-model="form.variant" /></label>
        <label>Year<input v-model.number="form.year" type="number" min="1900" /></label>
        <label>Vehicle type<select v-model="form.vehicle_type" required @change="emit('selectVehicleType')"><option>Car</option><option>Van</option><option>Truck</option><option>Pickup</option><option>Motorcycle</option><option>Bus</option><option>SUV</option><option>Heavy Equipment</option><option>Other</option></select></label>
        <label>Current mileage<input v-model.number="form.current_mileage" type="number" disabled /><small>Update mileage from the Mileage tab.</small></label>
        <label>Color<input v-model="form.color" /></label>
        <label>Purchased date<input v-model="form.acquisition_date" type="date" /></label>
        <label>Vehicle cost<input v-model.number="form.acquisition_cost" type="number" min="0" step="0.01" /></label>
        <label>Status<select v-model="form.status"><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option><option value="sold">Sold</option><option value="disposed">Disposed</option></select></label>
        <label class="full">Notes<textarea v-model="form.notes"></textarea></label>
      </div>
      <div class="modal-actions"><button type="button" class="btn" @click="emit('close')">Cancel</button><button class="btn btn-primary" :disabled="saving">{{ saving ? "Saving..." : "Save changes" }}</button></div>
    </form>
  </div>
</template>
