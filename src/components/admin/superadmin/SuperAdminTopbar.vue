<script setup lang="ts">
import { LogOut, Menu } from "lucide-vue-next";
import { appName } from "../../../config/app";

interface Props {
  title: string;
  userName?: string;
}

withDefaults(defineProps<Props>(), { userName: "" });

const emit = defineEmits<{
  openMenu: [];
  logout: [];
}>();
</script>

<template>
  <header class="superadmin-topbar">
    <button class="icon-btn superadmin-menu-button" aria-label="Open navigation" @click="emit('openMenu')">
      <Menu />
    </button>
    <div>
      <small>{{ appName }} Control Center</small>
      <strong>{{ title }}</strong>
    </div>
    <div class="superadmin-topbar-account">
      <span>{{ userName }}</span>
      <button class="btn" @click="emit('logout')"><LogOut />Sign out</button>
    </div>
  </header>
</template>
