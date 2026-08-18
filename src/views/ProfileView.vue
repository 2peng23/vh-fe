<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { KeyRound, Save, UserRound } from "lucide-vue-next";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import api, { errorMessage, validationErrors } from "../api/client";
import { useAuthStore } from "../stores/auth";
import type { ApiEnvelope, User } from "../types";

const auth = useAuthStore();
const loading = ref(true);
const savingProfile = ref(false);
const savingPassword = ref(false);
const message = ref("");
const error = ref("");
const profileErrors = ref<Record<string, string[]>>({});
const passwordErrors = ref<Record<string, string[]>>({});

const profileForm = reactive({
  name: "",
  phone: "",
});
const passwordForm = reactive({
  current_password: "",
  password: "",
  password_confirmation: "",
});

function syncForm() {
  profileForm.name = auth.user?.name ?? "";
  profileForm.phone = auth.user?.phone ?? "";
}

async function loadProfile() {
  loading.value = true;
  error.value = "";

  try {
    await auth.fetchMe();
    syncForm();
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  savingProfile.value = true;
  message.value = "";
  error.value = "";
  profileErrors.value = {};

  try {
    const { data } = await api.put<ApiEnvelope<User>>("/me", profileForm);
    auth.user = data.data;
    localStorage.setItem("vehiclehub_user", JSON.stringify(data.data));
    syncForm();
    message.value = "Profile updated.";
  } catch (exception) {
    error.value = errorMessage(exception);
    profileErrors.value = validationErrors(exception);
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  savingPassword.value = true;
  message.value = "";
  error.value = "";
  passwordErrors.value = {};

  try {
    await api.put("/me/password", passwordForm);
    passwordForm.current_password = "";
    passwordForm.password = "";
    passwordForm.password_confirmation = "";
    message.value = "Password changed. Please sign in again on your other devices.";
  } catch (exception) {
    error.value = errorMessage(exception);
    passwordErrors.value = validationErrors(exception);
  } finally {
    savingPassword.value = false;
  }
}

onMounted(loadProfile);
</script>

<template>
  <div>
    <PageHeader
      title="Profile"
      description="Manage your owner account details and password."
    />

    <div v-if="message" class="alert">{{ message }}</div>
    <div v-if="error" class="alert error">{{ error }}</div>

    <LoadingState v-if="loading" />

    <section v-else class="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <form class="grid min-w-0 gap-4 rounded-lg border border-slate-200 bg-white p-5" @submit.prevent="saveProfile">
        <header class="mb-1 flex items-center gap-3">
          <UserRound class="h-[38px] w-[38px] rounded-lg border border-teal-100 bg-teal-50 p-2.5 text-teal-700" />
          <div>
            <h2 class="m-0 text-lg font-extrabold text-slate-900">Account Details</h2>
            <p class="mt-1 text-xs text-slate-500">{{ auth.user?.email }}</p>
          </div>
        </header>

        <label class="grid gap-2 text-xs font-extrabold text-slate-700">
          Name
          <input v-model="profileForm.name" required maxlength="150" autocomplete="name" />
          <small v-if="profileErrors.name" class="text-red-600">{{ profileErrors.name[0] }}</small>
        </label>

        <label class="grid gap-2 text-xs font-extrabold text-slate-700">
          Phone
          <input v-model="profileForm.phone" maxlength="30" autocomplete="tel" />
          <small v-if="profileErrors.phone" class="text-red-600">{{ profileErrors.phone[0] }}</small>
        </label>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span class="mb-1 block text-[10px] font-extrabold uppercase text-slate-500">Role</span>
            <strong class="block break-words text-sm font-extrabold capitalize text-slate-900">{{ auth.user?.role?.replace("_", " ") }}</strong>
          </div>
          <div class="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span class="mb-1 block text-[10px] font-extrabold uppercase text-slate-500">Business</span>
            <strong class="block break-words text-sm font-extrabold capitalize text-slate-900">{{ auth.user?.business?.name || "—" }}</strong>
          </div>
        </div>

        <button class="btn btn-primary justify-self-start max-sm:w-full" type="submit" :disabled="savingProfile">
          <Save />
          {{ savingProfile ? "Saving..." : "Save profile" }}
        </button>
      </form>

      <form class="grid min-w-0 gap-4 rounded-lg border border-slate-200 bg-white p-5" @submit.prevent="changePassword">
        <header class="mb-1 flex items-center gap-3">
          <KeyRound class="h-[38px] w-[38px] rounded-lg border border-teal-100 bg-teal-50 p-2.5 text-teal-700" />
          <div>
            <h2 class="m-0 text-lg font-extrabold text-slate-900">Password</h2>
            <p class="mt-1 text-xs text-slate-500">Update the password used to access your account.</p>
          </div>
        </header>

        <label class="grid gap-2 text-xs font-extrabold text-slate-700">
          Current password
          <input
            v-model="passwordForm.current_password"
            type="password"
            required
            autocomplete="current-password"
          />
          <small v-if="passwordErrors.current_password" class="text-red-600">{{ passwordErrors.current_password[0] }}</small>
        </label>

        <label class="grid gap-2 text-xs font-extrabold text-slate-700">
          New password
          <input
            v-model="passwordForm.password"
            type="password"
            required
            autocomplete="new-password"
          />
          <small v-if="passwordErrors.password" class="text-red-600">{{ passwordErrors.password[0] }}</small>
        </label>

        <label class="grid gap-2 text-xs font-extrabold text-slate-700">
          Confirm new password
          <input
            v-model="passwordForm.password_confirmation"
            type="password"
            required
            autocomplete="new-password"
          />
        </label>

        <button class="btn btn-primary justify-self-start max-sm:w-full" type="submit" :disabled="savingPassword">
          <KeyRound />
          {{ savingPassword ? "Changing..." : "Change password" }}
        </button>
      </form>
    </section>
  </div>
</template>
