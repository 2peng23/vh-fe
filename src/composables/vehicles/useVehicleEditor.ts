import { reactive, ref, type Ref } from "vue";
import api, { errorMessage, validationErrors } from "../../api/client";
import type { Vehicle } from "../../types";

export function useVehicleEditor(
  vehicleId: string | number,
  vehicle: Ref<Vehicle | undefined>,
  error: Ref<string>,
  reloadVehicle: () => Promise<void>,
) {
  const editModal = ref(false);
  const editSaving = ref(false);
  const editErrors = ref<Record<string, string[]>>({});
  const editForm = reactive<Record<string, any>>({});

  function openEdit() {
    if (!vehicle.value) return;

    editErrors.value = {};
    Object.assign(editForm, {
      plate_number: vehicle.value.plate_number,
      brand: vehicle.value.brand,
      model: vehicle.value.model,
      variant: vehicle.value.variant || "",
      year: vehicle.value.year || "",
      vehicle_type: vehicle.value.vehicle_type,
      color: vehicle.value.color || "",
      acquisition_date: vehicle.value.acquisition_date?.slice(0, 10) || "",
      acquisition_cost: vehicle.value.acquisition_cost || "",
      status: vehicle.value.status,
      notes: vehicle.value.notes || "",
      current_mileage: vehicle.value.current_mileage,
    });

    editModal.value = true;
  }

  async function saveEdit() {
    editSaving.value = true;
    editErrors.value = {};
    error.value = "";

    try {
      const { current_mileage: _currentMileage, ...payload } = editForm;
      await api.put(`/vehicles/${vehicleId}`, payload);
      editModal.value = false;
      await reloadVehicle();
    } catch (e) {
      error.value = errorMessage(e);
      editErrors.value = validationErrors(e);
    } finally {
      editSaving.value = false;
    }
  }

  return {
    editModal,
    editSaving,
    editErrors,
    editForm,
    openEdit,
    saveEdit,
  };
}
