import { computed, onBeforeUnmount, ref, type Ref } from "vue";
import api, { errorMessage } from "../../api/client";

export function useVehiclePreviews(error: Ref<string>) {
  const documentFile = ref<File | null>(null);
  const mileagePhoto = ref<File | null>(null);
  const mileageOverride = ref(false);

  const documentPreviewUrl = ref("");
  const documentPreviewOpen = ref(false);
  const documentPreviewName = ref("vehicle-document");
  const documentPreviewType = ref("");

  const photoPreviewUrl = ref("");
  const photoPreviewOpen = ref(false);
  const photoPreviewName = ref("odometer-photo.jpg");

  const currentPhotoUrl = ref("");
  const currentPhotoLoading = ref(false);

  const documentPreviewIsPdf = computed(
    () =>
      documentPreviewType.value === "application/pdf" ||
      documentPreviewName.value.toLowerCase().endsWith(".pdf"),
  );

  const documentPreviewIsImage = computed(
    () =>
      documentPreviewType.value.startsWith("image/") ||
      /\.(?:jpe?g|png)$/i.test(documentPreviewName.value),
  );

  function selectDocumentFile(event: Event) {
    documentFile.value = (event.target as HTMLInputElement).files?.[0] || null;
  }

  function clearCurrentPhoto() {
    if (currentPhotoUrl.value) {
      URL.revokeObjectURL(currentPhotoUrl.value);
      currentPhotoUrl.value = "";
    }
    currentPhotoLoading.value = false;
  }

  function selectMileagePhoto(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    mileagePhoto.value = file;
    if (file) {
      clearCurrentPhoto();
      currentPhotoUrl.value = URL.createObjectURL(file);
    }
  }

  async function loadCurrentMileagePhoto(row: any) {
    if (!row?.photo) return;
    currentPhotoLoading.value = true;
    try {
      const response = await api.get(`/mileage/${row.id}/photo`, {
        responseType: "blob",
      });
      currentPhotoUrl.value = URL.createObjectURL(response.data);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      currentPhotoLoading.value = false;
    }
  }

  async function viewDocument(row: any) {
    const response = await api.get(`/documents/${row.id}/download`, {
      responseType: "blob",
    });
    closeDocumentPreview();
    documentPreviewUrl.value = URL.createObjectURL(response.data);
    documentPreviewName.value = row.file_path?.split("/").pop() || "vehicle-document";
    documentPreviewType.value = response.data.type || "";
    documentPreviewOpen.value = true;
  }

  function downloadPreviewDocument() {
    if (!documentPreviewUrl.value) return;
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

  async function downloadMileagePhoto(row: any) {
    const response = await api.get(`/mileage/${row.id}/photo`, {
      responseType: "blob",
    });
    closePhotoPreview();
    photoPreviewUrl.value = URL.createObjectURL(response.data);
    photoPreviewName.value = row.photo?.split("/").pop() || "odometer-photo.jpg";
    photoPreviewOpen.value = true;
  }

  function downloadPreviewPhoto() {
    if (!photoPreviewUrl.value) return;
    const link = document.createElement("a");
    link.href = photoPreviewUrl.value;
    link.download = photoPreviewName.value;
    link.click();
  }

  function closePhotoPreview() {
    photoPreviewOpen.value = false;
    if (photoPreviewUrl.value) {
      URL.revokeObjectURL(photoPreviewUrl.value);
      photoPreviewUrl.value = "";
    }
  }

  function resetEditorFiles() {
    clearCurrentPhoto();
    documentFile.value = null;
    mileagePhoto.value = null;
    mileageOverride.value = false;
  }

  onBeforeUnmount(() => {
    closeDocumentPreview();
    closePhotoPreview();
    clearCurrentPhoto();
  });

  return {
    documentFile,
    mileagePhoto,
    mileageOverride,
    documentPreviewUrl,
    documentPreviewOpen,
    documentPreviewName,
    documentPreviewType,
    documentPreviewIsPdf,
    documentPreviewIsImage,
    photoPreviewUrl,
    photoPreviewOpen,
    photoPreviewName,
    currentPhotoUrl,
    currentPhotoLoading,
    selectDocumentFile,
    selectMileagePhoto,
    loadCurrentMileagePhoto,
    viewDocument,
    downloadPreviewDocument,
    closeDocumentPreview,
    downloadMileagePhoto,
    downloadPreviewPhoto,
    closePhotoPreview,
    clearCurrentPhoto,
    resetEditorFiles,
  };
}
