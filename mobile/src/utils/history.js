function formatDateTime(value) {
  if (!value) return "Sin fecha";

  try {
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function buildMobileHistoryItems(analysisItems = []) {
  return analysisItems.map((item) => ({
    id: `AN-${String(item.id_analisis).padStart(3, "0")}`,
    zone: item.zone_title ?? "Zona no definida",
    processedAt: formatDateTime(item.fecha_analisis),
    free: item.espacios_libres ?? 0,
    occupied: item.espacios_ocupados ?? 0,
    vehicles: item.total_vehiculos ?? item.vehiculos_detectados ?? 0,
    imageName: item.image_name ?? "Sin imagen",
    precision: item.precision_modelo ?? 0,
  }));
}
