export const vehicleCodeOptions = [
  { prefix: "TRK-", type: "Truck", label: "TRK- — Truck" },
  { prefix: "VAN-", type: "Van", label: "VAN- — Van" },
  { prefix: "CAR-", type: "Car", label: "CAR- — Car" },
  { prefix: "BUS-", type: "Bus", label: "BUS- — Bus" },
  { prefix: "PUP-", type: "Pickup", label: "PUP- — Pickup" },
  { prefix: "MC-", type: "Motorcycle", label: "MC- — Motorcycle" },
  { prefix: "SUV-", type: "SUV", label: "SUV- — SUV" },
  {
    prefix: "HEQ-",
    type: "Heavy Equipment",
    label: "HEQ- — Heavy Equipment",
  },
  { prefix: "OTH-", type: "Other", label: "OTH- — Other" },
];

export const vehicleDetailTabs = [
  ["overview", "Overview"],
  ["mileage", "Mileage"],
  ["maintenance", "Maintenance"],
  ["schedules", "PMS schedules"],
  ["expenses", "Expenses"],
  ["documents", "Documents"],
  ["issues", "Issues"],
  ["fuel", "Fuel"],
] as const;
