import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "../layouts/AppLayout.vue";
import LoginView from "../views/auth/LoginView.vue";
import RegisterView from "../views/auth/RegisterView.vue";
import DashboardView from "../views/DashboardView.vue";
import VehiclesView from "../views/vehicles/VehiclesView.vue";
import VehicleDetailView from "../views/vehicles/VehicleDetailView.vue";
import ResourceView from "../views/ResourceView.vue";
import ReportsView from "../views/ReportsView.vue";
import NotificationsView from "../views/NotificationsView.vue";
import OperationsView from "../views/OperationsView.vue";
import AuditLogsView from "../views/AuditLogsView.vue";
import StaffView from "../views/StaffView.vue";
import SuperAdminView from "../views/SuperAdminView.vue";
import PlanEndedView from "../views/auth/PlanEndedView.vue";
import BusinessDisabledView from "../views/auth/BusinessDisabledView.vue";
import SupportChatView from "../views/SupportChatView.vue";
import PlanTransactionsView from "../views/PlanTransactionsView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginView, meta: { guest: true } },
    { path: "/register", component: RegisterView, meta: { guest: true } },
    {
      path: "/plan-ended",
      component: PlanEndedView,
      meta: { planEnded: true },
    },
    {
      path: "/business-disabled",
      component: BusinessDisabledView,
      meta: { accessBlocked: true },
    },
    {
      path: "/staff-disabled",
      component: BusinessDisabledView,
      meta: { staffBlocked: true },
    },
    {
      path: "/support",
      component: SupportChatView,
      meta: { ownerSupport: true },
    },
    {
      path: "/superadmin",
      component: SuperAdminView,
      meta: { superadmin: true },
    },
    {
      path: "/",
      component: AppLayout,
      children: [
        {
          path: "",
          name: "dashboard",
          component: DashboardView,
          meta: { permission: "dashboard.view" },
        },
        {
          path: "vehicles",
          name: "vehicles",
          component: VehiclesView,
          meta: { permission: "vehicles.view" },
        },
        {
          path: "vehicles/:id",
          name: "vehicle-detail",
          component: VehicleDetailView,
          meta: { permission: "vehicles.view" },
        },
        {
          path: "maintenance",
          component: OperationsView,
          props: { operation: "maintenance" },
          meta: { permission: "maintenance.view" },
        },
        {
          path: "issues",
          component: OperationsView,
          props: { operation: "issues" },
          meta: { permission: "issues.view" },
        },
        {
          path: "documents",
          component: OperationsView,
          props: { operation: "documents" },
          meta: { permission: "documents.view" },
        },
        {
          path: "drivers",
          component: ResourceView,
          props: {
            resource: "drivers",
            title: "Drivers",
            description: "Manage drivers, licenses, and employment records.",
          },
          meta: { permission: "drivers.view" },
        },
        {
          path: "assignments",
          component: ResourceView,
          props: {
            resource: "assignments",
            title: "Assignments",
            description: "Track current and historical vehicle assignments.",
          },
          meta: { permission: "assignments.view" },
        },
        {
          path: "reports",
          component: ReportsView,
          meta: { permission: "reports.view" },
        },
        {
          path: "notifications",
          component: NotificationsView,
          meta: { permission: "notifications.view" },
        },
        {
          path: "audit-logs",
          component: AuditLogsView,
          meta: { permission: "audit.view" },
        },
        {
          path: "staff",
          component: StaffView,
          meta: { permission: "staff.view" },
        },
        {
          path: "plan-transactions",
          component: PlanTransactionsView,
          meta: { ownerTransactions: true },
        },
      ],
    },
  ],
});
router.beforeEach((to) => {
  const logged = !!localStorage.getItem("vehiclehub_token");
  const user = JSON.parse(localStorage.getItem("vehiclehub_user") || "null");
  const planEnded = user?.business?.subscription?.plan_ended === true;
  const businessInactive = user?.business?.status === "inactive";
  const staffInactive = user?.role === "staff" && user?.status === "inactive";

  if (to.meta.staffBlocked) {
    if (!logged) return "/login";
    if (!staffInactive) return "/";
    return;
  }

  // Restricted account pages are only available for the matching account state.
  if (to.meta.accessBlocked) {
    if (!logged) return "/login";
    if (!businessInactive)
      return user?.role === "super_admin" ? "/superadmin" : "/";
    return;
  }
  if (to.meta.planEnded) {
    if (!logged) return "/login";
    if (!planEnded || businessInactive) {
      if (businessInactive) return "/business-disabled";
      return user?.role === "super_admin" ? "/superadmin" : "/";
    }
    return;
  }
  if (!logged && !to.meta.guest) return "/login";
  if (logged && to.meta.guest) return "/";
  if (staffInactive) return "/staff-disabled";
  if (businessInactive) return "/business-disabled";
  if (planEnded && !["/", "/plan-transactions"].includes(to.path)) return "/";
  if (to.meta.ownerTransactions && user?.role !== "owner") return "/";
  if (to.meta.ownerSupport && user?.role !== "owner")
    return user?.business?.subscription?.plan_ended ? "/plan-ended" : "/";
  if (user?.role === "super_admin" && !to.meta.superadmin && !to.meta.guest)
    return "/superadmin";
  if (to.meta.superadmin && user?.role !== "super_admin") return "/";
  if (
    to.meta.permission &&
    user?.role !== "super_admin" &&
    !(user?.permissions || []).includes(to.meta.permission)
  )
    return to.path === "/" ? undefined : "/";
});
export default router;
