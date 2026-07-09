import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bike,
  Car,
  Clock3,
  ParkingCircle,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import { getMobileParkingOverview } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getSpaceClasses = (space) => {
  if (space.status === "user_occupied" && space.confirmation_required) {
    return "border-amber-300/75 bg-amber-400/70 text-black";
  }

  if (space.status === "user_occupied") {
    return "border-sky-300/75 bg-sky-400/70 text-black";
  }

  if (space.status === "occupied") {
    return "border-red-300/70 bg-red-500/72 text-white";
  }

  return "border-emerald-200/70 bg-emerald-400/72 text-black";
};

const getSpaceStatusLabel = (space) => {
  if (space.status === "user_occupied" && space.confirmation_required) {
    return "Pendiente de confirmar";
  }

  if (space.status === "user_occupied") {
    return "Marcado desde app";
  }

  if (space.status === "occupied") {
    return "Ocupado por analisis";
  }

  return "Libre";
};

const getSpaceTitle = (space) =>
  space.status === "user_occupied"
    ? `${space.display_code} · ${space.reported_user_name ?? "Usuario"} · ${space.estimated_hours ?? "-"} h · ${getSpaceStatusLabel(space)}`
    : `${space.display_code} · ${getSpaceStatusLabel(space)}`;

const makeFallbackSlot = (index, total) => {
  const columns = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(total || 1))));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const rows = Math.ceil((total || 1) / columns);
  return {
    left: 10 + column * (80 / columns),
    top: 18 + row * (64 / rows),
    width: Math.min(7.8, 68 / columns),
    height: Math.min(12, 48 / rows),
    rotate: 0,
  };
};

const ZONE_A_PHYSICAL_SLOTS = [
  // Motocicletas, fila izquierda inferior hacia superior.
  { left: 18.8, top: 60.6, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 57, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 53.4, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 49.8, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 46.2, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 42.6, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 39, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 35.4, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 31.8, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 26.8, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 23.4, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 20, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 16.6, width: 5.3, height: 3.5, rotate: 0 },
  { left: 18.8, top: 13.2, width: 5.3, height: 3.5, rotate: 0 },

  // Motocicletas, fila central junto al area verde.
  { left: 29.4, top: 66.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 62.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 59.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 55.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 52.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 48.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 45.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 41.7, width: 5.1, height: 3.35, rotate: 0 },
  { left: 29.4, top: 38.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 32.6, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 29.4, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 26.2, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 23, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 19.8, width: 5.1, height: 3.35, rotate: 0 },
  { left: 27.8, top: 16.6, width: 5.1, height: 3.35, rotate: 0 },

  // Autos, fila superior.
  { left: 39.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 45.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 51.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 57.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 63.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 69.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 75.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 81.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },
  { left: 87.8, top: 8.2, width: 5.2, height: 13, rotate: 0 },

  // Autos, fila inferior inclinada.
  { left: 48.5, top: 81.5, width: 8, height: 7, rotate: 49 },
  { left: 53.4, top: 79.4, width: 8, height: 7, rotate: 49 },
  { left: 58.3, top: 77.3, width: 8, height: 7, rotate: 49 },
  { left: 63.2, top: 75.2, width: 8, height: 7, rotate: 49 },
  { left: 68.1, top: 73.1, width: 8, height: 7, rotate: 49 },
  { left: 73, top: 71, width: 8, height: 7, rotate: 49 },
  { left: 77.9, top: 68.9, width: 8, height: 7, rotate: 49 },
  { left: 82.8, top: 66.8, width: 8, height: 7, rotate: 49 },
];

const ZONE_A_PHYSICAL_OFFSET_X = -4;

const createPhysicalRow = ({
  count,
  left,
  top,
  stepX,
  stepY = 0,
  width,
  height,
  rotate = 0,
  startNumber = 1,
}) =>
  Array.from({ length: count }, (_, index) => ({
    slotNumber: startNumber + index,
    left: left + index * stepX,
    top: top + index * stepY,
    width,
    height,
    rotate,
  }));

const ZONE_B_PHYSICAL_SLOTS = [
  // Fila superior sobre la berma central, agrupada 3 + 4 + 3.
  ...createPhysicalRow({
    count: 3,
    left: 1.8,
    top: 30,
    stepX: 6.5,
    stepY: 0,
    width: 5.8,
    height: 8.5,
    rotate: 0,
    startNumber: 1,
  }),
  ...createPhysicalRow({
    count: 4,
    left: 28.6,
    top: 30,
    stepX: 7,
    stepY: 0,
    width: 6.4,
    height: 8.2,
    rotate: 0,
    startNumber: 4,
  }),
  ...createPhysicalRow({
    count: 3,
    left: 64,
    top: 30,
    stepX: 6.4,
    stepY: 0,
    width: 5.7,
    height: 8.2,
    rotate: 0,
    startNumber: 8,
  }),

  // Fila inferior de la berma central.
  ...createPhysicalRow({
    count: 30,
    left: 1.8,
    top: 44,
    stepX: 3.30,
    stepY: 0,
    width: 3.1,
    height: 9.4,
    rotate: 0,
    startNumber: 14,
  }),

  // Fila inferior junto al borde del estacionamiento.
  ...createPhysicalRow({
    count: 30,
    left: 2.5,
    top: 74.8,
    stepX: 3.5,
    stepY: 0,
    width: 3.35,
    height: 10.2,
    rotate: 0,
    startNumber: 45,
  }),

  // Espacios laterales del extremo derecho.
  ...createPhysicalRow({
    count: 5,
    left: 108,
    top: 7.8,
    stepX: 0,
    stepY: 9.3,
    width: 5.1,
    height: 8,
    rotate: 0,
    startNumber: 75,
  }),
].filter(
  (slot) => ![11, 12, 13, 42, 43, 44].includes(slot.slotNumber),
);

const getPhysicalSlot = (zoneId, index, total) => {
  if (total <= 0) return makeFallbackSlot(index, total);

  if (zoneId === "A") {
    const slot = ZONE_A_PHYSICAL_SLOTS[index] ?? makeFallbackSlot(index, total);
    return {
      ...slot,
      left: slot.left + ZONE_A_PHYSICAL_OFFSET_X,
    };
  }

  if (zoneId === "B") {
    return ZONE_B_PHYSICAL_SLOTS[index] ?? makeFallbackSlot(index, total);
  }

  return makeFallbackSlot(index, total);
};

export default function ParkingSpacesPage({ onLogout }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedZoneId, setExpandedZoneId] = useState(null);
  const physicalMapScrollRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadSpaces = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await getMobileParkingOverview();

        if (isMounted) {
          setData(response);
        }
      } catch {
        if (isMounted) {
          setError("No se pudieron cargar los espacios libres.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSpaces();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!expandedZoneId) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expandedZoneId]);

  useEffect(() => {
    const scrollArea = physicalMapScrollRef.current;
    if (expandedZoneId !== "B" || !scrollArea) return undefined;

    const handleWheel = (event) => {
      const canScrollHorizontally =
        scrollArea.scrollWidth > scrollArea.clientWidth + 1;
      const isMostlyVertical =
        Math.abs(event.deltaY) > Math.abs(event.deltaX);

      if (!canScrollHorizontally || !isMostlyVertical) return;

      const maxScrollLeft = scrollArea.scrollWidth - scrollArea.clientWidth;
      const nextScrollLeft = Math.max(
        0,
        Math.min(maxScrollLeft, scrollArea.scrollLeft + event.deltaY),
      );

      if (nextScrollLeft !== scrollArea.scrollLeft) {
        event.preventDefault();
        scrollArea.scrollLeft = nextScrollLeft;
      }
    };

    scrollArea.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      scrollArea.removeEventListener("wheel", handleWheel);
    };
  }, [expandedZoneId]);

  const zones = data?.zones ?? [];
  const expandedZone = zones.find((zone) => zone.id === expandedZoneId);
  const expandedZoneModal =
    expandedZone && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[999] grid place-items-center overflow-hidden bg-black/92 px-4 py-6 backdrop-blur-md">
            <section
              className={`flex h-[min(92svh,920px)] w-full flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[#0a0a0a] shadow-2xl ${
                expandedZone.id === "B" ? "max-w-[1500px]" : "max-w-6xl"
              }`}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                    Vista fisica ampliada
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Zona {expandedZone.id}
                  </h2>
                  <p className="mt-1 text-sm text-white/52">
                    {expandedZone.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedZoneId(null)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/70 transition hover:bg-white/[.08] hover:text-white"
                  aria-label="Cerrar plano grande"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
                <div className="mb-4 flex shrink-0 flex-wrap items-center justify-center gap-x-7 gap-y-3 rounded-[22px] border border-white/10 bg-black/35 px-4 py-4 text-xs font-bold text-white/62">
                  <StatusPill label="Libre" className="border-emerald-300/70 bg-emerald-400/18" />
                  <StatusPill label="Ocupado por analisis" className="border-red-300/70 bg-red-500/20" />
                  <StatusPill label="Marcado desde app" className="border-sky-300/75 bg-sky-400/20" />
                  <StatusPill label="Pendiente de confirmar" className="border-amber-300/75 bg-amber-400/20" />
                </div>
                <div
                  ref={physicalMapScrollRef}
                  className="physical-map-scroll-area min-h-0 flex-1 overflow-auto overscroll-contain"
                >
                  <ParkingPhysicalMap zone={expandedZone} large />
                </div>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;
  const manualMarkedCount = useMemo(
    () =>
      zones.reduce(
        (total, zone) =>
          total +
          zone.spaces.filter((space) => space.status === "user_occupied").length,
        0,
      ),
    [zones],
  );

  return (
    <PageScaffold
      title="Espacios libres"
      description="Vista conectada a las zonas A y B de Tecsup, sincronizada con las marcas manuales reportadas desde la app mobile."
      module="parking"
      onLogout={onLogout}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={ParkingCircle}
            label="Libres"
            value={data?.free_spaces ?? 0}
            detail="Disponibles entre A y B"
          />
          <SummaryCard
            icon={Car}
            label="Ocupados"
            value={data?.occupied_spaces ?? 0}
            detail={`de ${data?.total_spaces ?? 0} espacios`}
          />
          <SummaryCard
            icon={Smartphone}
            label="Marcados en app"
            value={manualMarkedCount}
            detail="Ocupados manualmente por usuarios"
          />
          <SummaryCard
            icon={Clock3}
            label="Ultima revision"
            value={formatDateTime(data?.updated_at)}
            detail={`${data?.analysis_mode ?? "sin modo"} · ${data?.source ?? "sin fuente"}`}
            compact
          />
        </div>

        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-[26px] border border-white/10 bg-[#0a0a0a] text-white/60">
            <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
            Cargando espacios...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </div>
        ) : zones.length === 0 ? (
          <div className="rounded-[26px] border border-white/10 bg-[#0a0a0a] px-4 py-12 text-center text-white/55">
            Aun no hay zonas calculadas.
          </div>
        ) : (
          <>
            <div className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                    Leyenda
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Estado por analisis y por app mobile
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-white/60">
                  <LegendDot className="border-white/20 bg-white/[.08]" label="Libre" />
                  <LegendDot className="border-red-300/35 bg-red-400/20" label="Ocupado por analisis" />
                  <LegendDot className="border-sky-300/40 bg-sky-400/18" label="Marcado desde app" />
                  <LegendDot className="border-amber-300/40 bg-amber-400/18" label="Pendiente de confirmar" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {zones.map((zone) => {
                const userMarkedSpaces = zone.spaces.filter(
                  (space) => space.status === "user_occupied",
                );

                return (
                  <section
                    key={zone.id}
                    className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4"
                  >
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-xl font-black uppercase text-white">
                          Zona {zone.id}
                        </h2>
                        <ZoneCapacityTotal zone={zone} />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-4">
                        <p className="min-w-0 text-sm text-white/52">
                          {zone.subtitle}
                        </p>
                        <ZoneCapacityBreakdown zone={zone} />
                      </div>
                    </div>

                    <div>
                      <ParkingPhysicalMap
                        zone={zone}
                        compact
                        onOpen={() => setExpandedZoneId(zone.id)}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      <ZoneMetric label="Libres" value={zone.free_spaces} />
                      <ZoneMetric label="Ocupados" value={zone.occupied_spaces} />
                      <ZoneMetric
                        label="% Ocupacion"
                        value={`${zone.total_spaces ? Math.round((zone.occupied_spaces / zone.total_spaces) * 100) : 0}%`}
                      />
                    </div>

                    <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[.03] p-3.5">
                      <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                        Marcados desde app
                      </p>
                      {userMarkedSpaces.length === 0 ? (
                        <p className="mt-2 text-sm leading-6 text-white/52">
                          Ningun usuario ha marcado espacios manualmente en esta zona.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {userMarkedSpaces.map((space) => (
                            <div
                              key={`${zone.id}-${space.display_code}`}
                              className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-white">
                                    {space.display_code}
                                  </p>
                                  <p className="mt-1 text-sm text-white/58">
                                    {space.reported_user_name ?? "Usuario sin nombre"}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-black text-white">
                                    {space.estimated_hours ?? "-"} h
                                  </p>
                                  <p
                                    className={`mt-1 text-[11px] font-bold ${
                                      space.confirmation_required
                                        ? "text-amber-200"
                                        : "text-white/52"
                                    }`}
                                  >
                                    {space.confirmation_required
                                      ? "Requiere confirmacion"
                                      : "Activo"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      {expandedZoneModal}
    </PageScaffold>
  );
}

function ParkingPhysicalMap({ zone, compact = false, large = false, onOpen }) {
  const isZoneA = zone.id === "A";
  const isZoneB = zone.id === "B";
  const zoneBCoordinateWidth = 1780;
  const zoneBVisualWidth = 2040;
  const spaces = zone.spaces ?? [];
  const referenceSlots = isZoneA
    ? ZONE_A_PHYSICAL_SLOTS
    : isZoneB
      ? ZONE_B_PHYSICAL_SLOTS
      : [];
  const visualSpaces =
    referenceSlots.length > 0 && spaces.length < referenceSlots.length
      ? Array.from({ length: referenceSlots.length }, (_, index) => {
          const slot = referenceSlots[index];
          const slotDisplayCode = `${zone.id}-${String(slot.slotNumber ?? index + 1).padStart(3, "0")}`;
          const existingSpace =
            spaces.find((space) => space.display_code === slotDisplayCode) ??
            (isZoneA ? spaces[index] : null);
          return (
            existingSpace ?? {
              code: `${zone.id}-reference-${slot.slotNumber ?? index + 1}`,
              display_code: slotDisplayCode,
              status: "free",
              source: "physical_reference",
              isReferenceOnly: true,
            }
          );
        })
      : spaces;

  if (compact && (isZoneA || isZoneB)) {
    return <ParkingZonePreview zone={zone} onOpen={onOpen} />;
  }

  const RootTag = compact && onOpen ? "button" : "div";

  return (
    <RootTag
      type={RootTag === "button" ? "button" : undefined}
      onClick={compact ? onOpen : undefined}
      className={`group relative block w-full rounded-[24px] border border-white/10 bg-[#111] text-left ${
        large && isZoneB ? "overflow-visible" : "overflow-hidden"
      } ${
        compact
          ? "transition duration-300 hover:scale-[1.015] hover:border-white/22 focus:outline-none focus:ring-2 focus:ring-white/35"
          : ""
      } ${
        large
          ? isZoneB
            ? ""
            : "min-w-[760px] max-w-[1120px]"
          : ""
      }`}
      style={large && isZoneB ? { minWidth: `${zoneBVisualWidth}px` } : undefined}
    >
      <div
        className={`relative ${
          large
            ? isZoneB
              ? "h-[560px]"
              : "h-[620px]"
            : "h-[260px]"
        } bg-transparent`}
      >
        <div
          className={large && isZoneB ? "absolute inset-y-0 left-0" : "contents"}
          style={large && isZoneB ? { width: `${zoneBCoordinateWidth}px` } : undefined}
        >
        {!isZoneB ? (
          <div className="absolute left-[6%] top-[3%] h-[95.5%] w-[91%] rounded-[22px] border-2 border-yellow-200/45" />
        ) : null}

        {isZoneA ? (
          <>
            <div className="absolute left-[12.3%] top-[11.5%] h-[55%] w-[10%] rounded-[16px] border border-yellow-200/35 bg-black/12" />
            <div className="absolute left-[22.6%] top-[15%] h-[56.5%] w-[9%] rounded-[16px] border border-yellow-200/30 bg-black/10" />
            <div className="absolute left-[34.4%] top-[5.5%] h-[19%] w-[56%] rounded-[18px] border border-yellow-200/30 bg-black/10" />
            <div className="absolute left-[36%] top-[31%] h-[28%] w-[42%] rounded-full border border-white/10 bg-black/10" />
            <div className="absolute bottom-[12%] left-[43%] h-[20%] w-[45%] -rotate-[14deg] rounded-[20px] border border-yellow-200/30 bg-black/10" />
          </>
        ) : null}

        <div className="absolute inset-0">
          {visualSpaces.map((space, index) => {
            const slot = getPhysicalSlot(zone.id, index, visualSpaces.length);
            const tooltipBelow = slot.top < 14;
            const SlotTag = compact ? "span" : "button";
            return (
              <SlotTag
                key={space.code}
                type={SlotTag === "button" ? "button" : undefined}
                title={getSpaceTitle(space)}
                className={`group/slot absolute grid place-items-center rounded-[6px] border text-center shadow-[0_2px_8px_rgba(0,0,0,.2)] transition-transform hover:z-20 hover:scale-110 ${getSpaceClasses(space)}`}
                style={{
                  left: `${slot.left}%`,
                  top: `${slot.top}%`,
                  width: `${slot.width}%`,
                  height: `${slot.height}%`,
                  transform: `rotate(${slot.rotate}deg)`,
                }}
              >
                  <span
                  className={`physical-map-tooltip pointer-events-none absolute left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-white/20 bg-black/90 px-2 py-1 font-black leading-none text-white shadow-xl group-hover/slot:block ${
                    tooltipBelow
                      ? "top-full translate-y-[35%]"
                      : "top-0 -translate-y-[115%]"
                  } ${
                    large ? "text-[11px]" : "text-[10px]"
                  }`}
                >
                  {space.display_code}
                </span>
              </SlotTag>
            );
          })}
        </div>
        </div>

        {compact ? (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-black/38 shadow-2xl backdrop-blur-sm transition duration-300 group-hover:bg-black/48">
              <img
                src={zone.id === "A" ? "/zonaAicon.png" : "/zonaBicon.png"}
                alt={`Zona ${zone.id}`}
                className="pointer-events-none h-28 w-28 object-contain drop-shadow-[0_0_18px_rgba(255,255,255,.42)]"
              />
            </div>
          </div>
        ) : (
          <div className="physical-map-badge pointer-events-none absolute left-3 top-3 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/50">
            Plano {zone.id}
          </p>
          <p className="text-sm font-black text-white">
            {zone.free_spaces} libres · {zone.occupied_spaces} ocupados
          </p>
        </div>
        )}
      </div>
    </RootTag>
  );
}

function ParkingZonePreview({ zone, onOpen }) {
  const previewImage = zone.id === "A" ? "/zone-a-preview.png" : "/zone-b-preview.png";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-[24px] border border-white/10 bg-transparent text-left transition duration-300 hover:scale-[1.015] hover:border-white/22 focus:outline-none focus:ring-2 focus:ring-white/35"
      aria-label={`Abrir vista fisica ampliada de Zona ${zone.id}`}
    >
      <div className="relative h-[330px] w-full overflow-hidden bg-black/12">
        <img
          src={previewImage}
          alt={`Vista previa de Zona ${zone.id}`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.34))]" />
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="relative grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-black/38 shadow-2xl backdrop-blur-sm transition duration-300 group-hover:bg-black/48">
              <img
                src={zone.id === "A" ? "/zonaAicon.png" : "/zonaBicon.png"}
                alt={`Zona ${zone.id}`}
                className="pointer-events-none h-28 w-28 object-contain drop-shadow-[0_0_18px_rgba(255,255,255,.42)]"
              />
          </div>
        </div>
      </div>
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, compact = false }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
      <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-white/45">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p
        className={`font-black text-white ${
          compact ? "text-base leading-6" : "text-3xl"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold text-white/55">{detail}</p>
    </div>
  );
}

function ZoneCapacityTotal({ zone }) {
  return (
    <span className="mr-4 shrink-0 text-sm font-black uppercase text-white/78">
      {zone.id === "A" ? "46 espacios" : "73 espacios"}
    </span>
  );
}

function ZoneCapacityBreakdown({ zone }) {
  if (zone.id === "A") {
    return (
      <span className="mr-4 inline-flex shrink-0 items-center gap-3 text-sm font-black text-white/72">
        <span className="inline-flex items-center gap-1.5">
          <Bike className="h-4 w-4" />
          29
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Car className="h-4 w-4" />
          17
        </span>
      </span>
    );
  }

  return (
    <span className="mr-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-black text-white/72">
      <Car className="h-4 w-4" />
      73
    </span>
  );
}

function ZoneMetric({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[.03] p-3">
      <p className="text-[11px] font-black uppercase tracking-[.16em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function LegendDot({ className, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-xl border ${className}`} />
      {label}
    </span>
  );
}

function StatusPill({ className, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full border ${className}`} />
      <span>{label}</span>
    </span>
  );
}
