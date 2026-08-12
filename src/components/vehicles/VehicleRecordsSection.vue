<script setup lang="ts">
import { Download, Eye, Pencil, Plus, Trash2 } from "lucide-vue-next";
import EmptyState from "../EmptyState.vue";
import LoadingState from "../LoadingState.vue";
import PaginationControls from "../PaginationControls.vue";
import type { PaginationMeta } from "../../types";

type VehicleRecord = Record<string, any> & { id: number };

defineProps<{
  title: string;
  resource: string;
  rows: VehicleRecord[];
  loading: boolean;
  meta?: PaginationMeta;
  page: number;
  perPage: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  deletingId: number | null;
  columns: (row: VehicleRecord) => string[];
  cellValue: (row: VehicleRecord, column: string) => unknown;
  displayValue: (value: unknown) => string;
}>();

const emit = defineEmits<{
  add: [];
  edit: [row: VehicleRecord];
  remove: [row: VehicleRecord];
  viewMaintenance: [row: VehicleRecord];
  downloadDocument: [row: VehicleRecord];
  viewPhoto: [row: VehicleRecord];
  "update:page": [value: number];
  "update:perPage": [value: number];
}>();
</script>

<template>
  <section>
    <div class="subpage-head"><div><h2>{{ title }}</h2><p>Complete history for this vehicle.</p></div><button v-if="canCreate" class="btn btn-primary" @click="emit('add')"><Plus />Add record</button></div>
    <LoadingState v-if="loading" />
    <EmptyState v-else-if="!rows.length" :title="`No ${resource} records`" />
    <div v-else class="card table-card">
      <div class="table-wrap"><table><thead><tr><th v-for="column in columns(rows[0])" :key="column">{{ column.replaceAll('_', ' ') }}</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="row in rows" :key="row.id">
          <td v-for="column in columns(row)" :key="column">
            <button v-if="column === 'file_path' && row[column]" class="table-action" @click="emit('downloadDocument', row)"><Download />Download</button>
            <button v-else-if="column === 'photo' && row[column]" class="table-action" @click="emit('viewPhoto', row)"><Eye />View photo</button>
            <template v-else>{{ displayValue(cellValue(row, column)) }}</template>
          </td>
          <td><div class="row-actions"><button v-if="resource === 'maintenance'" class="icon-btn" title="View full information" @click="emit('viewMaintenance', row)"><Eye /></button><button v-if="canUpdate" class="icon-btn" title="Edit record" @click="emit('edit', row)"><Pencil /></button><button v-if="canDelete" class="icon-btn danger" title="Delete record" :disabled="deletingId === row.id" @click="emit('remove', row)"><Trash2 /></button></div></td>
        </tr>
      </tbody></table></div>
      <PaginationControls v-if="meta" :meta="meta" :page="page" :per-page="perPage" @update:page="emit('update:page', $event)" @update:per-page="emit('update:perPage', $event)" />
    </div>
  </section>
</template>
