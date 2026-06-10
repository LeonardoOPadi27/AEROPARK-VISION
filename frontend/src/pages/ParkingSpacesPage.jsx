import { useEffect, useMemo, useState } from "react";
import { Car, Clock3, ParkingCircle, RefreshCw, Smartphone } from "lucide-react";
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
    return "border-amber-300/40 bg-amber-400/18 text-amber-50";
  }

  if (space.status === "user_occupied") {
    return "border-sky-300/40 bg-sky-400/18 text-sky-50";
  }

  if (space.status === "occupied") {
    return "border-red-300/35 bg-red-400/20 text-red-100";
  }

  return "border-white/20 bg-white/[.08] text-white";
};

export default function ParkingSpacesPage({ onLogout }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  const zones = data?.zones ?? [];
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
      description="Vista conectada a las tres zonas de Tecsup y sincronizada con las marcas manuales reportadas desde la app mobile."
      module="parking"
      onLogout={onLogout}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={ParkingCircle}
            label="Libres"
            value={data?.free_spaces ?? 0}
            detail="Disponibles entre A, B y C"
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

            <div className="grid gap-4 xl:grid-cols-3">
              {zones.map((zone) => {
                const userMarkedSpaces = zone.spaces.filter(
                  (space) => space.status === "user_occupied",
                );

                return (
                  <section
                    key={zone.id}
                    className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                          Zona {zone.id}
                        </p>
                        <h2 className="mt-1 text-xl font-black">{zone.title}</h2>
                        <p className="mt-1 text-sm text-white/52">{zone.subtitle}</p>
                      </div>
                      <span className="shrink-0 rounded-xl border border-white/10 bg-white/[.03] px-2.5 py-1 text-xs font-bold text-white/68">
                        {zone.total_spaces} espacios
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      <ZoneMetric label="Libres" value={zone.free_spaces} />
                      <ZoneMetric label="Ocupados" value={zone.occupied_spaces} />
                      <ZoneMetric
                        label="% Ocupacion"
                        value={`${zone.total_spaces ? Math.round((zone.occupied_spaces / zone.total_spaces) * 100) : 0}%`}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {zone.spaces.map((space) => (
                        <div
                          key={space.code}
                          title={
                            space.status === "user_occupied"
                              ? `${space.display_code} · ${space.reported_user_name ?? "Usuario"} · ${space.estimated_hours ?? "-"} h`
                              : `${space.display_code} · ${space.status === "occupied" ? "Ocupado" : "Libre"}`
                          }
                          className={`rounded-[18px] border p-2 text-center ${getSpaceClasses(space)}`}
                        >
                          <p className="text-[11px] font-black leading-none">
                            {space.display_code}
                          </p>
                          {space.status === "user_occupied" ? (
                            <div className="mt-2 space-y-1">
                              <p className="truncate text-[10px] font-bold text-white/88">
                                {space.reported_user_name ?? "Usuario"}
                              </p>
                              <p className="text-[10px] font-black">
                                {space.estimated_hours ?? "-"} h
                              </p>
                            </div>
                          ) : (
                            <p className="mt-2 text-[10px] font-bold text-white/65">
                              {space.status === "occupied" ? "YOLO" : "Libre"}
                            </p>
                          )}
                        </div>
                      ))}
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
    </PageScaffold>
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
