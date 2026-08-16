import type { Vehicle } from "../../types";

export const issueCategories = [
  "Engine",
  "Transmission",
  "Brakes",
  "Steering",
  "Suspension",
  "Electrical",
  "Battery",
  "Tires and Wheels",
  "Cooling System",
  "Air Conditioning",
  "Fuel System",
  "Body and Exterior",
  "Interior",
  "Safety Equipment",
  "Other",
];

export function createRecordDefaults(vehicle?: Vehicle) {
  const today = new Date().toISOString().slice(0, 10);
  const mileage = vehicle?.current_mileage || 0;

  return {
    mileage: {
      mileage,
      notes: "",
    },

    maintenance: {
      maintenance_schedule_id: "",
      service_date: today,
      mileage,
      maintenance_type: "Unscheduled maintenance",
      service_provider: "",
      labor_cost: 0,
      parts_cost: 0,
      other_cost: 0,
      notes: "",
    },

    expenses: {
      category: "Fuel",
      amount: 0,
      expense_date: today,
      vendor: "",
      description: "",
    },

    documents: {
      document_type: "Registration",
      issue_date: "",
      expiration_date: "",
      document_number: "",
    },

    issues: {
      title: "",
      description: "",
      category: "Other",
      custom_category: "",
      priority: "medium",
      assigned_to_name: "",
    },

    fuel: {
      fuel_date: today,
      mileage,
      liters: 0,
      price_per_liter: 0,
    },

    schedules: {
      maintenance_type: "General Maintenance Schedule",
      interval_type: "both",
      interval_km: 5000,
      interval_months: 6,
      reminder_km: 2000,
      reminder_days: 30,
    },
  } as Record<string, Record<string, any>>;
}

/**
 * Maintenance schedule field descriptions.
 */
const scheduleFieldHelp: Record<string, string> = {
  maintenance_type:
    "The service to perform, such as oil change, brake inspection, or general maintenance.",

  interval_type:
    "Choose mileage, date, or both. Both means maintenance is due when either limit is reached first.",

  interval_km:
    "The distance between services. For example, 5,000 means service every 5,000 km.",

  interval_months:
    "The number of months between services. For example, 6 means service every six months.",

  reminder_km:
    "How early to warn by mileage. If service is due at 10,000 km and this is 2,000, the warning starts at 8,000 km.",

  reminder_days:
    "How early to warn by date. For example, 30 means warn the owner 30 days before service is due.",
};

/**
 * Maintenance record field descriptions.
 */
const maintenanceFieldHelp: Record<string, string> = {
  maintenance_schedule_id:
    "Select the planned schedule completed by this work. The system will calculate its next due date and mileage. Choose Unscheduled maintenance for unexpected repairs.",

  service_date: "The date when the maintenance work was completed.",

  mileage: "The vehicle odometer reading when the work was completed.",

  maintenance_type:
    "The work performed, such as Change Oil, Brake Repair, or Tire Replacement. Selecting a schedule fills this automatically.",

  service_provider:
    "The mechanic, workshop, dealership, or company that performed the work.",

  labor_cost: "The amount paid for mechanic or technician labor.",

  parts_cost: "The total cost of replacement parts and materials.",

  other_cost:
    "Additional charges such as towing, disposal fees, or shop supplies.",

  notes:
    "Extra information about the work, including an explanation of other costs.",
};

/**
 * Field descriptions for the standard vehicle tabs.
 */
const vehicleTabFieldHelp: Record<string, Record<string, string>> = {
  mileage: {
    mileage: "The current odometer reading in kilometers.",

    notes: "Optional context about this reading or why it was recorded.",

    odometer_photo:
      "Upload a clear photo of the odometer as evidence of the recorded mileage.",

    mileage_override:
      "Allows a lower mileage only for an odometer replacement or a verified mileage correction. This action is recorded in the audit log.",
  },

  expenses: {
    category:
      "The type of expense, such as Fuel, Maintenance, Toll, or Insurance.",

    amount: "The total amount paid for this expense.",

    expense_date: "The date when the expense was incurred.",

    vendor: "The person, shop, station, or company that received the payment.",

    description: "Additional details explaining what the expense covered.",
  },

  documents: {
    document_type:
      "The kind of vehicle document, such as Registration or Insurance.",

    issue_date:
      "The date when the document was issued or acquired by the vehicle owner.",

    expiration_date: "The date when this document expires or requires renewal.",

    document_number:
      "The official reference or identification number on the document.",
  },

  issues: {
    title: "A short name that clearly identifies the vehicle problem.",

    description: "A detailed explanation of the symptoms or problem observed.",

    category: "The vehicle system or area affected by the issue.",

    custom_category:
      "A custom category used when the predefined choices do not apply.",

    priority: "How urgently the issue needs attention, from low to critical.",

    assigned_to_name:
      "The person, team, mechanic, or workshop responsible for the issue.",
  },

  fuel: {
    fuel_date: "The date when the vehicle was refueled.",

    mileage: "The odometer reading at the time of refueling.",

    liters: "The quantity of fuel added, measured in liters.",

    price_per_liter: "The price paid for each liter of fuel.",
  },
};

/**
 * Return the help description for a field.
 */
export function fieldHelp(
  tab: string,
  key: string | number,
): string | undefined {
  const field = String(key);

  if (tab === "schedules") {
    return scheduleFieldHelp[field];
  }

  if (tab === "maintenance") {
    return maintenanceFieldHelp[field];
  }

  return vehicleTabFieldHelp[tab]?.[field];
}

/**
 * Convert internal field names into UI labels.
 */
export function fieldLabel(key: string | number) {
  const field = String(key);

  if (field === "maintenance_schedule_id") {
    return "Maintenance schedule";
  }

  if (field === "issue_date") {
    return "Acquired date";
  }

  if (field === "assigned_to_name") {
    return "Assigned to";
  }

  if (field === "custom_category") {
    return "Other category";
  }

  if (field === "odometer_photo") {
    return "Odometer photo";
  }

  if (field === "mileage_override") {
    return "Allow mileage override";
  }

  return field.replaceAll("_", " ");
}
