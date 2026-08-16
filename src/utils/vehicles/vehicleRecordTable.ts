import { formatDate } from "../date";

export function vehicleRecordColumns(resource: string, row: any) {
  if (resource === "mileage") {
    return ["recorded_by_name", "mileage", "recorded_at", "photo", "is_override"];
  }

  if (resource === "maintenance") {
    return [
      "record_id",
      "performed_by_name",
      "service_provider",
      "service_date",
      "mileage",
      "maintenance_type",
    ];
  }

  if (resource === "issues") {
    return [
      "reported_by_name",
      "assigned_to_name",
      "title",
      "priority",
      "category",
      "status",
    ];
  }

  if (resource === "expenses") {
    return [
      "record_id",
      "category",
      "amount",
      "expense_date",
      "vendor",
      "recorded_by_name",
      "source",
    ];
  }

  if (resource === "fuel") {
    return [
      "record_id",
      "recorded_by_name",
      "fuel_date",
      "mileage",
      "liters",
      "price_per_liter",
      "total_amount",
    ];
  }

  return Object.keys(row)
    .filter(
      (key) =>
        ![
          "id",
          "business_id",
          "vehicle_id",
          "created_at",
          "updated_at",
          "deleted_at",
          "notes",
          "description",
        ].includes(key),
    )
    .slice(0, 6);
}

export function vehicleRecordCellValue(row: any, column: string) {
  if (column === "record_id") return row.id;
  if (column === "performed_by_name") return row.performer?.name || "—";
  if (column === "service_provider") return row.service_provider || "Not specified";
  if (column === "recorded_by_name") return row.recorder?.name || "—";
  if (column === "reported_by_name") return row.reporter?.name || "—";
  if (column === "assigned_to_name") {
    return row.assigned_to_name || row.assignee?.name || "Unassigned";
  }
  return row[column];
}

export function prettyRecordValue(value: any) {
  if (value === null || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDate(value);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDate(value);
  }
  return String(value).replaceAll("_", " ");
}
