<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { RouterLink } from "vue-router";
import {
  ChevronDown,
  Download,
  Eye,
  Filter,
  RotateCcw,
  Search,
  X,
} from "lucide-vue-next";
import api, { errorMessage } from "../api/client";
import type { ApiEnvelope, PaginationMeta } from "../types";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import PaginationControls from "../components/PaginationControls.vue";
import { formatDate, formatDateTime } from "../utils/date";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type AuditLog = {
  id: number;
  action: string;
  entity_name: string;
  entity_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;

  user: {
    name: string;
    email: string;
  } | null;
};

/*
|--------------------------------------------------------------------------
| Audit State
|--------------------------------------------------------------------------
*/

const rows = ref<AuditLog[]>([]);
const meta = ref<PaginationMeta>();

const loading = ref(true);
const error = ref("");

const page = ref(1);
const perPage = ref(20);

const selected = ref<AuditLog | null>(null);

/*
|--------------------------------------------------------------------------
| Filter State
|--------------------------------------------------------------------------
*/

const filtersExpanded = ref(false);

const activeRange = ref<"today" | "week" | "month" | "all" | null>("all");

const filters = reactive({
  search: "",
  action: "",
  entity_type: "",
  from: "",
  to: "",
});

/*
|--------------------------------------------------------------------------
| Filter Options
|--------------------------------------------------------------------------
*/

const options = ref<{
  actions: string[];

  entities: {
    value: string;
    label: string;
  }[];
}>({
  actions: [],
  entities: [],
});

/*
|--------------------------------------------------------------------------
| Document Preview
|--------------------------------------------------------------------------
*/

const documentPreviewUrl = ref("");
const documentPreviewOpen = ref(false);
const documentPreviewName = ref("vehicle-document");
const documentPreviewType = ref("");

const documentPreviewIsPdf = computed(
  () =>
    documentPreviewType.value === "application/pdf" ||
    documentPreviewName.value.toLowerCase().endsWith(".pdf"),
);

const documentPreviewIsImage = computed(
  () =>
    documentPreviewType.value.startsWith("image/") ||
    /\.(?:jpe?g|png|gif|webp)$/i.test(documentPreviewName.value),
);

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

function localDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/*
|--------------------------------------------------------------------------
| Request Params
|--------------------------------------------------------------------------
*/

function params() {
  return {
    ...filters,
    page: page.value,
    per_page: perPage.value,
  };
}

/*
|--------------------------------------------------------------------------
| Load Audit Logs
|--------------------------------------------------------------------------
*/

async function load() {
  loading.value = true;
  error.value = "";

  try {
    const { data } = await api.get<ApiEnvelope<AuditLog[]>>("/audit-logs", {
      params: params(),
    });

    rows.value = data.data;
    meta.value = data.meta;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

/*
|--------------------------------------------------------------------------
| Apply Filters
|--------------------------------------------------------------------------
*/

function applyFilters() {
  if (filters.from && !filters.to) {
    filters.to = filters.from;
  }

  if (filters.to && !filters.from) {
    filters.from = filters.to;
  }

  if (filters.from && filters.from === filters.to) {
    activeRange.value = filters.from === localDate(new Date()) ? "today" : null;
  }

  if (page.value === 1) {
    load();
  } else {
    page.value = 1;
  }
}

/*
|--------------------------------------------------------------------------
| Reset Filters
|--------------------------------------------------------------------------
*/

function clearFilters() {
  Object.assign(filters, {
    search: "",
    action: "",
    entity_type: "",
    from: "",
    to: "",
  });

  activeRange.value = "all";
  error.value = "";

  if (page.value === 1) {
    load();
  } else {
    page.value = 1;
  }
}

/*
|--------------------------------------------------------------------------
| Quick Date Ranges
|--------------------------------------------------------------------------
*/

function setDateRange(range: "today" | "week" | "month" | "all") {
  const end = new Date();
  const start = new Date(end);

  if (range === "week") {
    start.setDate(start.getDate() - 7);
  }

  if (range === "month") {
    start.setMonth(start.getMonth() - 1);
  }

  filters.from = range === "all" ? "" : localDate(start);

  filters.to = range === "all" ? "" : localDate(end);

  activeRange.value = range;

  applyFilters();
}

/*
|--------------------------------------------------------------------------
| Label Formatter
|--------------------------------------------------------------------------
*/

function label(value: string) {
  if (value === "file_path") {
    return "File";
  }

  if (value === "vehicle_id") {
    return "Vehicle";
  }

  return value.replaceAll(".", " ").replaceAll("_", " ");
}

/*
|--------------------------------------------------------------------------
| Document Preview
|--------------------------------------------------------------------------
*/

async function viewDocumentFile(
  row: AuditLog,
  path: unknown,
  version: "old" | "new",
) {
  if (!path) {
    return;
  }

  try {
    const response = await api.get(`/audit-logs/${row.id}/document-file`, {
      params: {
        version,
      },

      responseType: "blob",
    });

    closeDocumentPreview();

    documentPreviewUrl.value = URL.createObjectURL(response.data);

    documentPreviewName.value =
      String(path).split("/").pop() || "vehicle-document";

    documentPreviewType.value = response.data.type || "";

    documentPreviewOpen.value = true;
  } catch (e) {
    error.value = errorMessage(e);
  }
}

function downloadPreviewDocument() {
  if (!documentPreviewUrl.value) {
    return;
  }

  const link = document.createElement("a");

  link.href = documentPreviewUrl.value;
  link.download = documentPreviewName.value;

  link.click();
}

function closeDocumentPreview() {
  documentPreviewOpen.value = false;

  if (documentPreviewUrl.value) {
    URL.revokeObjectURL(documentPreviewUrl.value);

    documentPreviewUrl.value = "";
  }
}

/*
|--------------------------------------------------------------------------
| Value Formatter
|--------------------------------------------------------------------------
*/

function value(value: unknown, key = "") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string" && key.endsWith("_date")) {
    return formatDate(value);
  }

  if (
    typeof value === "string" &&
    (key.endsWith("_at") || /^\d{4}-\d{2}-\d{2}T/.test(value))
  ) {
    return formatDateTime(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

/*
|--------------------------------------------------------------------------
| Changes
|--------------------------------------------------------------------------
*/

function changes(row: AuditLog) {
  const keys = new Set([
    ...Object.keys(row.old_values || {}),
    ...Object.keys(row.new_values || {}),
  ]);

  return [...keys]
    .filter((key) => !["updated_at", "created_at"].includes(key))
    .map((key) => ({
      key,
      old: row.old_values?.[key],
      new: row.new_values?.[key],
    }));
}

/*
|--------------------------------------------------------------------------
| Lifecycle
|--------------------------------------------------------------------------
*/

onMounted(async () => {
  try {
    const { data } = await api.get<ApiEnvelope<typeof options.value>>(
      "/audit-logs/options",
    );

    options.value = data.data;
  } catch (e) {
    error.value = errorMessage(e);
  }

  load();
});

/*
|--------------------------------------------------------------------------
| Pagination Watchers
|--------------------------------------------------------------------------
*/

watch(page, load);

watch(perPage, () => {
  if (page.value === 1) {
    load();
  } else {
    page.value = 1;
  }
});

onBeforeUnmount(closeDocumentPreview);
</script>

<template>
  <div>
    <!-- ================================================================
         PAGE HEADER
    ================================================================= -->

    <PageHeader
      title="Audit log"
      description="Review important activity and data changes across your vehicle."
    />

    <!-- ================================================================
         FILTERS
         
         IMPORTANT:
         These use the SAME classes as the Report page.
    ================================================================= -->

    <div class="report-filters audit-report-filters">
      <!-- Filter Header -->

      <button
        type="button"
        class="report-filter-toggle"
        :aria-expanded="filtersExpanded"
        aria-controls="audit-filter-content"
        @click="filtersExpanded = !filtersExpanded"
      >
        <span>
          <Filter aria-hidden="true" />
          Filters
        </span>

        <ChevronDown
          aria-hidden="true"
          :class="{
            rotated: filtersExpanded,
          }"
        />
      </button>

      <!-- Expanded Filter Content -->

      <Transition name="filter-panel">
        <div
          v-if="filtersExpanded"
          id="audit-filter-content"
          class="report-filter-content"
        >
          <!-- ==========================================================
               QUICK DATE FILTERS
          =========================================================== -->

          <div class="quick-date-filters" aria-label="Quick date filters">
            <button
              v-for="option in [
                ['today', 'Today'],
                ['week', '1 Week'],
                ['month', '1 Month'],
                ['all', 'All'],
              ] as const"
              :key="option[0]"
              type="button"
              :class="[
                'filter-chip',
                {
                  active: activeRange === option[0],
                },
              ]"
              @click="setDateRange(option[0])"
            >
              {{ option[1] }}
            </button>
          </div>

          <!-- ==========================================================
               FILTER FIELDS
          =========================================================== -->

          <div class="report-filter-fields audit-filter-fields">
            <!-- From -->

            <label>
              From

              <input
                v-model="filters.from"
                type="date"
                @input="activeRange = null"
              />
            </label>

            <!-- To -->

            <label>
              To

              <input
                v-model="filters.to"
                type="date"
                @input="activeRange = null"
              />
            </label>

            <!-- Action -->

            <label>
              Action

              <select v-model="filters.action">
                <option value="">All actions</option>

                <option
                  v-for="item in options.actions"
                  :key="item"
                  :value="item"
                >
                  {{ label(item) }}
                </option>
              </select>
            </label>

            <!-- Entity -->

            <label>
              Entity

              <select v-model="filters.entity_type">
                <option value="">All entities</option>

                <option
                  v-for="item in options.entities"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>

            <!-- Search -->

            <label class="audit-search">
              Search

              <div>
                <Search aria-hidden="true" />

                <input
                  v-model.trim="filters.search"
                  type="search"
                  autocomplete="off"
                  placeholder="User, action or record ID"
                  @keydown.enter="applyFilters"
                />
              </div>
            </label>

            <!-- ======================================================
                 FILTER ACTIONS
            ======================================================= -->

            <div class="report-filter-actions">
              <button type="button" class="btn" @click="clearFilters">
                <RotateCcw aria-hidden="true" />

                Reset
              </button>

              <button
                type="button"
                class="btn btn-primary"
                @click="applyFilters"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ================================================================
         ERROR
    ================================================================= -->

    <div v-if="error" class="alert error">
      {{ error }}
    </div>

    <!-- ================================================================
         LOADING
    ================================================================= -->

    <LoadingState v-if="loading" />

    <!-- ================================================================
         EMPTY STATE
    ================================================================= -->

    <EmptyState
      v-else-if="!rows.length"
      title="No audit activity found"
      message="Try changing the filters or perform a vehicle action."
    />

    <!-- ================================================================
         AUDIT TABLE
    ================================================================= -->

    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date and time</th>

              <th>User</th>

              <th>Action</th>

              <th>Entity</th>

              <th>IP address</th>

              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <!-- Date -->

              <td>
                {{ formatDateTime(row.created_at) }}
              </td>

              <!-- User -->

              <td>
                <strong>
                  {{ row.user?.name || "System" }}
                </strong>

                <small v-if="row.user?.email" class="cell-small">
                  {{ row.user.email }}
                </small>
              </td>

              <!-- Action -->

              <td>
                <span class="audit-action">
                  {{ label(row.action) }}
                </span>
              </td>

              <!-- Entity -->

              <td>
                {{ row.entity_name }}

                <small class="cell-small"> #{{ row.entity_id || "—" }} </small>
              </td>

              <!-- IP -->

              <td>
                {{ row.ip_address || "—" }}
              </td>

              <!-- Details -->

              <td>
                <button
                  type="button"
                  class="icon-btn"
                  title="View changes"
                  @click="selected = row"
                >
                  <Eye />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->

      <PaginationControls
        v-if="meta"
        :meta="meta"
        v-model:page="page"
        v-model:per-page="perPage"
      />
    </div>

    <!-- ================================================================
         AUDIT DETAILS MODAL
    ================================================================= -->

    <div v-if="selected" class="modal-backdrop" @click.self="selected = null">
      <section class="modal audit-detail-modal" role="dialog" aria-modal="true">
        <!-- Modal Header -->

        <div class="modal-head">
          <div>
            <h2>
              {{ label(selected.action) }}
            </h2>

            <p>
              {{ selected.entity_name }}

              #{{ selected.entity_id }}

              ·

              {{ formatDateTime(selected.created_at) }}
            </p>
          </div>

          <button
            type="button"
            class="icon-btn"
            aria-label="Close"
            @click="selected = null"
          >
            <X />
          </button>
        </div>

        <!-- ==========================================================
             AUDIT CONTEXT
        =========================================================== -->

        <div class="audit-context">
          <div>
            <small> Performed by </small>

            <strong>
              {{ selected.user?.name || "System" }}
            </strong>
          </div>

          <div>
            <small> IP address </small>

            <strong>
              {{ selected.ip_address || "—" }}
            </strong>
          </div>

          <div class="full">
            <small> User agent </small>

            <span>
              {{ selected.user_agent || "—" }}
            </span>
          </div>
        </div>

        <!-- ==========================================================
             CHANGES TABLE
        =========================================================== -->

        <div class="table-wrap audit-changes">
          <table>
            <thead>
              <tr>
                <th>Field</th>

                <th>Previous value</th>

                <th>New value</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="change in changes(selected)" :key="change.key">
                <!-- Field -->

                <td>
                  {{ label(change.key) }}
                </td>

                <!-- Previous Value -->

                <td>
                  <button
                    v-if="change.key === 'file_path' && change.old"
                    type="button"
                    class="table-action"
                    @click="viewDocumentFile(selected, change.old, 'old')"
                  >
                    <Eye />

                    View
                  </button>

                  <RouterLink
                    v-else-if="change.key === 'vehicle_id' && change.old"
                    class="source-link"
                    :to="`/vehicles/${change.old}`"
                    @click="selected = null"
                  >
                    Vehicle #{{ change.old }}
                  </RouterLink>

                  <template v-else>
                    {{ value(change.old, change.key) }}
                  </template>
                </td>

                <!-- New Value -->

                <td>
                  <button
                    v-if="change.key === 'file_path' && change.new"
                    type="button"
                    class="table-action"
                    @click="viewDocumentFile(selected, change.new, 'new')"
                  >
                    <Eye />

                    View
                  </button>

                  <RouterLink
                    v-else-if="change.key === 'vehicle_id' && change.new"
                    class="source-link"
                    :to="`/vehicles/${change.new}`"
                    @click="selected = null"
                  >
                    Vehicle #{{ change.new }}
                  </RouterLink>

                  <template v-else>
                    {{ value(change.new, change.key) }}
                  </template>
                </td>
              </tr>

              <tr v-if="!changes(selected).length">
                <td colspan="3" class="empty-cell">
                  No field-level changes recorded.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal Actions -->

        <div class="modal-actions">
          <button type="button" class="btn" @click="selected = null">
            Close
          </button>
        </div>
      </section>
    </div>

    <!-- ================================================================
         DOCUMENT PREVIEW
    ================================================================= -->

    <div
      v-if="documentPreviewOpen"
      class="modal-backdrop photo-preview-backdrop"
      @click.self="closeDocumentPreview"
    >
      <div
        class="photo-preview-modal document-preview-modal"
        role="dialog"
        aria-modal="true"
      >
        <!-- Preview Header -->

        <div class="modal-head">
          <div>
            <h2>Document preview</h2>

            <p>
              {{ documentPreviewName }}
            </p>
          </div>

          <div class="modal-head-actions">
            <button type="button" class="btn" @click="downloadPreviewDocument">
              <Download />

              Download
            </button>

            <button
              type="button"
              class="icon-btn"
              aria-label="Close"
              @click="closeDocumentPreview"
            >
              <X />
            </button>
          </div>
        </div>

        <!-- Preview Body -->

        <div class="document-preview-body">
          <iframe
            v-if="documentPreviewIsPdf"
            :src="documentPreviewUrl"
            title="Audited document preview"
          />

          <img
            v-else-if="documentPreviewIsImage"
            :src="documentPreviewUrl"
            alt="Audited document preview"
          />

          <EmptyState
            v-else
            title="Preview unavailable"
            message="This file type cannot be previewed. Use Download to open it on your device."
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
|--------------------------------------------------------------------------
| REPORT FILTER PANEL
|--------------------------------------------------------------------------
|
| Audit deliberately uses the same report-* classes so it has the
| exact same visual treatment as the Reports page.
|--------------------------------------------------------------------------
*/

.report-filters {
  width: 100%;
  padding: 0;
  overflow: hidden;
}

/*
|--------------------------------------------------------------------------
| Filter Toggle
|--------------------------------------------------------------------------
*/

.report-filter-toggle {
  width: 100%;

  padding: 14px 18px;

  border: 0;

  background: transparent;

  color: #24324a;

  font: inherit;
  font-weight: 700;

  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.report-filter-toggle > span {
  display: inline-flex;

  align-items: center;

  gap: 9px;
}

.report-filter-toggle svg {
  width: 18px;
  height: 18px;

  transition: transform 0.22s ease;
}

.report-filter-toggle svg.rotated {
  transform: rotate(180deg);
}

/*
|--------------------------------------------------------------------------
| Filter Content
|--------------------------------------------------------------------------
*/

.report-filter-content {
  padding: 16px 18px 18px;

  border-top: 1px solid #e3e8ee;
}

/*
|--------------------------------------------------------------------------
| Collapse / Expand
|--------------------------------------------------------------------------
*/

.filter-panel-enter-active,
.filter-panel-leave-active {
  overflow: hidden;

  transition:
    max-height 0.24s ease,
    opacity 0.18s ease,
    transform 0.2s ease;
}

.filter-panel-enter-from,
.filter-panel-leave-to {
  max-height: 0;

  opacity: 0;

  transform: translateY(-4px);
}

.filter-panel-enter-to,
.filter-panel-leave-from {
  max-height: 500px;

  opacity: 1;

  transform: translateY(0);
}

/*
|--------------------------------------------------------------------------
| Quick Date Filters
|--------------------------------------------------------------------------
*/

.quick-date-filters {
  display: flex;

  flex-wrap: wrap;

  gap: 7px;

  margin-bottom: 14px;
}

/*
|--------------------------------------------------------------------------
| IMPORTANT
|--------------------------------------------------------------------------
|
| These are the exact Report filter button dimensions.
|--------------------------------------------------------------------------
*/

.filter-chip {
  appearance: none;

  display: inline-flex;

  align-items: center;
  justify-content: center;

  min-height: 36px;

  padding: 7px 14px;

  border: 1px solid #d9e0e6;

  border-radius: 999px;

  background: #fff;

  color: #475569;

  font: inherit;

  font-size: 13px;

  font-weight: 600;

  cursor: pointer;

  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.filter-chip:hover {
  border-color: var(--teal);

  color: var(--teal-dark);
}

.filter-chip.active {
  border-color: var(--teal);

  background: var(--teal-soft);

  color: var(--teal-dark);
}

/*
|--------------------------------------------------------------------------
| FILTER GRID
|--------------------------------------------------------------------------
|
| Report:
|
| From       = max 180px
| To         = max 180px
| Category   = max 210px
| Vehicle    = remaining width
|
| Audit:
|
| From       = SAME 180px
| To         = SAME 180px
| Action     = SAME 210px
| Entity     = SAME 210px
| Search     = remaining width
|
|--------------------------------------------------------------------------
*/

.audit-filter-fields {
  display: grid;

  grid-template-columns:
    minmax(140px, 180px)
    minmax(140px, 180px)
    minmax(170px, 210px)
    minmax(170px, 210px)
    minmax(180px, 1fr);

  gap: 12px;

  align-items: end;
}

/*
|--------------------------------------------------------------------------
| EXACT REPORT LABEL SIZE
|--------------------------------------------------------------------------
*/

.report-filter-fields label {
  min-width: 0;

  font-size: 12px;

  font-weight: 600;

  color: #475569;
}

/*
|--------------------------------------------------------------------------
| EXACT REPORT INPUT / SELECT
|--------------------------------------------------------------------------
|
| Do not add custom heights here.
| The Reports page uses padding to determine the control height.
|--------------------------------------------------------------------------
*/

.report-filter-fields input,
.report-filter-fields select {
  display: block;

  width: 100%;

  min-width: 0;

  box-sizing: border-box;

  margin-top: 6px;

  border: 1px solid #d9e0e6;

  background: #fff;

  border-radius: 7px;

  padding: 10px 11px;

  color: #24324a;

  font: inherit;

  font-size: 13px;

  line-height: 18px;

  outline: 0;
}

.report-filter-fields input:focus,
.report-filter-fields select:focus {
  border-color: var(--teal);
}

/*
|--------------------------------------------------------------------------
| Make date / search appearance consistent
|--------------------------------------------------------------------------
*/

.report-filter-fields input[type="date"],
.report-filter-fields input[type="search"],
.report-filter-fields select {
  height: 40px;
}

/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
*/

.audit-search > div {
  position: relative;
}

.audit-search > div > svg {
  position: absolute;

  top: 50%;

  left: 11px;

  width: 16px;
  height: 16px;

  margin-top: 3px;

  color: var(--muted);

  pointer-events: none;

  transform: translateY(-50%);

  z-index: 1;
}

.audit-search input {
  padding-left: 35px;
}

/*
|--------------------------------------------------------------------------
| Filter Actions
|--------------------------------------------------------------------------
*/

.report-filter-actions {
  grid-column: 1 / -1;

  display: flex;

  justify-content: flex-end;

  gap: 8px;
}

.report-filter-actions .btn {
  display: inline-flex;

  align-items: center;
  justify-content: center;

  gap: 7px;

  white-space: nowrap;
}

.report-filter-actions svg {
  width: 16px;

  height: 16px;
}

/*
|--------------------------------------------------------------------------
| Tablet
|--------------------------------------------------------------------------
*/

@media (max-width: 1100px) {
  .audit-filter-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/*
|--------------------------------------------------------------------------
| Mobile
|--------------------------------------------------------------------------
*/

@media (max-width: 560px) {
  .report-filter-content {
    padding: 14px 14px 16px;
  }

  .audit-filter-fields {
    grid-template-columns: 1fr;
  }

  .report-filter-actions {
    flex-direction: column;
  }

  .report-filter-actions .btn {
    width: 100%;
  }

  .quick-date-filters {
    display: grid;

    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-chip {
    width: 100%;
  }
}
</style>
