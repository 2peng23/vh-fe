<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { FileUp, Loader2, Plus, Search, UploadCloud } from "lucide-vue-next";
import { readSheet } from "read-excel-file/browser";
import api, { errorMessage } from "../../../api/client";
import type { ApiEnvelope, PaginationMeta } from "../../../types";
import PaginationControls from "../../PaginationControls.vue";

interface LogisticsLead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  source_file: string | null;
}

interface ParsedLead {
  name: string;
  email: string | null;
  phone: string | null;
  source_file: string | null;
}

const rows = ref<LogisticsLead[]>([]);
const meta = ref<PaginationMeta | null>(null);
const search = ref("");
const page = ref(1);
const perPage = ref(20);
const loading = ref(true);
const importing = ref(false);
const importOpen = ref(false);
const dragging = ref(false);
const error = ref("");
const importMessage = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
let searchTimer: ReturnType<typeof window.setTimeout> | null = null;

const hasRows = computed(() => rows.value.length > 0);

function normalize(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
}

function normalizeEmail(value: string | null | undefined) {
  const email = normalize(value);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function sourceFileHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value) || (/^[^\s]+\.[^\s]+$/.test(value) && !value.includes("/"))) {
    return `https://${value}`;
  }
  return value;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeTableRows(rows: unknown[][]): ParsedLead[] {
  const cleanRows = rows
    .map((row) => row.map((cell) => String(cell || "").trim()))
    .filter((row) => row.some(Boolean));

  if (!cleanRows.length) return [];

  const headers = cleanRows[0].map((cell) => cell.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const hasHeader = headers.some((cell) =>
    ["name", "company", "logisticsname", "email", "phone", "number", "contactnumber", "sourcefile"].includes(cell),
  );
  const dataRows = hasHeader ? cleanRows.slice(1) : cleanRows;
  const nameIndex = hasHeader
    ? headers.findIndex((cell) => ["name", "company", "logisticsname", "businessname"].includes(cell))
    : 0;
  const emailIndex = hasHeader ? headers.findIndex((cell) => cell === "email" || cell === "emailaddress") : 1;
  const phoneIndex = hasHeader
    ? headers.findIndex((cell) => ["phone", "number", "contactnumber", "mobile", "telephone"].includes(cell))
    : 2;
  const sourceFileIndex = hasHeader
    ? headers.findIndex((cell) => ["sourcefile", "source", "file", "filename", "sourcefilename"].includes(cell))
    : -1;

  return dataRows
    .map((cells) => {
      const joined = cells.join(" ");
      const emailMatch = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const phoneMatch = joined.match(/(?:\+?63|0)\s?\d(?:[\d\s().-]){7,}/);
      const name =
        normalize(cells[nameIndex >= 0 ? nameIndex : 0]) ||
        joined
          .replace(emailMatch?.[0] || "", "")
          .replace(phoneMatch?.[0] || "", "")
          .trim();
      return {
        name,
        email: normalizeEmail(emailIndex >= 0 ? cells[emailIndex] : emailMatch?.[0]) || normalizeEmail(emailMatch?.[0]),
        phone: normalize(phoneIndex >= 0 ? cells[phoneIndex] : phoneMatch?.[0]) || normalize(phoneMatch?.[0]),
        source_file: normalize(sourceFileIndex >= 0 ? cells[sourceFileIndex] : null),
      };
    })
    .filter((row): row is ParsedLead => Boolean(row.name));
}

function parseTextRows(text: string): ParsedLead[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes(",") ? splitCsvLine(line) : line.split(/\t+/).map((cell) => cell.trim())));

  return normalizeTableRows(rows);
}

async function parseSpreadsheetRows(file: File): Promise<ParsedLead[]> {
  return normalizeTableRows(await readSheet(file));
}

async function parseFileRows(file: File) {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    return parseSpreadsheetRows(file);
  }

  return parseTextRows(await file.text());
}

async function loadRows(nextPage = page.value) {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.get<ApiEnvelope<LogisticsLead[]>>("/superadmin/logistics", {
      params: { page: nextPage, per_page: perPage.value, search: search.value || undefined },
    });
    rows.value = data.data;
    meta.value = data.meta || null;
    page.value = nextPage;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function importFile(file: File) {
  importing.value = true;
  error.value = "";
  importMessage.value = "";
  try {
    const parsed = await parseFileRows(file);
    if (!parsed.length) {
      importMessage.value = "No logistics rows found in that file.";
      return;
    }
    const { data } = await api.post<ApiEnvelope<{ saved: number; rows: LogisticsLead[] }>>(
      "/superadmin/logistics/import",
      {
        source_file: file.name,
        rows: parsed,
      },
    );
    importMessage.value = data.message;
    importOpen.value = false;
    await loadRows(1);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    importing.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}

function onFiles(files: FileList | null) {
  const file = files?.[0];
  if (file) importFile(file);
}

function onFileChange(event: Event) {
  onFiles((event.target as HTMLInputElement).files);
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  onFiles(event.dataTransfer?.files || null);
}

function runSearch() {
  if (page.value === 1) {
    loadRows(1);
    return;
  }
  page.value = 1;
}

onMounted(() => loadRows());

watch([page, perPage], () => loadRows());

watch(search, () => {
  if (searchTimer) window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    runSearch();
  }, 500);
});

onBeforeUnmount(() => {
  if (searchTimer) window.clearTimeout(searchTimer);
});
</script>

<template>
  <section class="superadmin-panel card logistics-panel">
    <div class="superadmin-toolbar logistics-toolbar">
      <div>
        <strong>Logistics</strong>
        <small>{{ meta?.total ?? rows.length }} saved contacts</small>
      </div>
      <button class="btn btn-primary" type="button" @click="importOpen = !importOpen">
        <Plus /> Add logistics
      </button>
    </div>

    <div v-if="importOpen" class="logistics-import">
      <button
        type="button"
        class="logistics-dropzone"
        :class="{ dragging }"
        @click="fileInput?.click()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <UploadCloud />
        <strong>Choose a CSV/XLSX file or drop it here</strong>
        <span>Use CSV or XLSX columns: name, email, phone. One contact per row.</span>
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        @change="onFileChange"
      />
    </div>

    <div class="logistics-filters">
      <label class="logistics-search">
        <span>Search</span>
        <div class="logistics-search-control">
          <Search />
          <input
            v-model.trim="search"
            class="logistics-search-input"
            type="search"
            placeholder="Name, email, or number"
            @keyup.enter="runSearch"
          />
        </div>
      </label>
    </div>

    <div v-if="error" class="alert error logistics-alert">{{ error }}</div>
    <div v-if="importMessage" class="alert success logistics-alert">{{ importMessage }}</div>

    <div class="logistics-body">
      <div v-if="loading || importing" class="logistics-empty">
        <Loader2 class="spin" />
        <strong>{{ importing ? "Reading file" : "Loading logistics" }}</strong>
      </div>

      <div v-else-if="!hasRows" class="logistics-empty">
        <FileUp />
        <strong>No logistics contacts yet</strong>
        <span>Click Add logistics to import a CSV or XLSX file.</span>
      </div>

      <div v-else class="table-wrap logistics-results">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Number</th>
              <th>Source file</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in rows" :key="lead.id">
              <td><strong>{{ lead.name }}</strong></td>
              <td>{{ lead.email || "Not provided" }}</td>
              <td>{{ lead.phone || "Not provided" }}</td>
              <td>
                <a
                  v-if="lead.source_file"
                  class="logistics-source-link"
                  :href="sourceFileHref(lead.source_file)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ lead.source_file }}
                </a>
                <span v-else>Not provided</span>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationControls
          v-if="meta"
          v-model:page="page"
          v-model:per-page="perPage"
          :meta="meta"
        />
      </div>
    </div>
  </section>
</template>
