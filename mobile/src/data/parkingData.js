const createSpaces = (prefix, totals) =>
  totals.map((status, index) => ({
    code: `${prefix}-${String(index + 1).padStart(3, "0")}`,
    status,
    vehicleColor:
      status === "occupied" ? ["Blanco", "Negro", "Gris", "Rojo"][index % 4] : null,
    estimatedHours: null,
    userConfirmedAt: null,
  }));

export const initialParkingZones = [
  {
    id: "A",
    title: "Estacionamiento A",
    subtitle: "Ingreso principal",
    updatedAt: "08:15 a. m.",
    spaces: createSpaces("A", [
      "free",
      "free",
      "occupied",
      "free",
      "occupied",
      "free",
      "free",
      "occupied",
      "free",
      "occupied",
      "free",
      "free",
    ]),
  },
  {
    id: "B",
    title: "Estacionamiento B",
    subtitle: "Zona pabellones",
    updatedAt: "08:17 a. m.",
    spaces: createSpaces("B", [
      "occupied",
      "occupied",
      "free",
      "free",
      "occupied",
      "free",
      "free",
      "free",
      "occupied",
      "free",
      "occupied",
      "free",
    ]),
  },
];

export const historyItems = [
  {
    id: "AN-104",
    zone: "Estacionamiento B",
    processedAt: "08 Jun 2026 · 08:17 a. m.",
    free: 7,
    occupied: 5,
  },
  {
    id: "AN-103",
    zone: "Estacionamiento A",
    processedAt: "08 Jun 2026 · 08:15 a. m.",
    free: 8,
    occupied: 4,
  },
];

export const stayOptions = [1, 2, 4, 6];

export const spaceCatalog = {
  free: {
    label: "Libre",
  },
  occupied: {
    label: "Ocupado",
  },
  user_occupied: {
    label: "Ocupado por usuario",
  },
};
