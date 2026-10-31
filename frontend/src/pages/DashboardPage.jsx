import { useEffect, useState } from "react";
import { ArrowUpRight, Bike, Car, ImageUp, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import PageScaffold from "../components/PageScaffold";
import { API_BASE_URL, getLatestAnalysis, getMobileParkingOverview } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "Sin revisión";
  const normalized = typeof value === "string" && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    ? `${value}Z`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Sin revisión";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getStoredImageUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
};

const fetchDashboardData = () => Promise.allSettled([
  getMobileParkingOverview(),
  getLatestAnalysis(),
]);

function SummaryValue({ label, value, color, primary = false }) {
  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 sm:p-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-white/55">
        <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-2 font-bold leading-none tabular-nums ${primary ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>
        {value}
      </p>
    </div>
  );
}

function ZoneRow({ zone }) {
  const available = zone.analysis_available;
  const located = available && zone.location_assignment_available;
  const total = zone.total_spaces || 1;
  const segments = [
    { label: "libres", count: zone.free_spaces ?? 0, color: "bg-emerald-500" },
    { label: "ocupados", count: zone.occupied_spaces ?? 0, color: "bg-rose-500" },
    { label: "sin confirmar", count: located ? zone.unknown_spaces ?? 0 : 0, color: "bg-amber-400" },
  ];

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-base font-bold">Zona {zone.id}</h3>
        <span className="text-xs text-white/55">{zone.total_spaces} espacios</span>
      </div>
      <p className="mt-1 text-xs text-white/55">{zone.title}</p>
      {available ? (
        <div className="mt-5">
          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-white/10"
            role="img"
            aria-label={`Zona ${zone.id}: ${located ? "" : "estimación de "}${segments.map((item) => `${item.count} ${item.label}`).join(", ")}`}
          >
            {segments.map((item) => (
              <span key={item.label} className={item.color} style={{ width: `${item.count / total * 100}%` }} />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/60">
            {located
              ? `${zone.free_spaces} libres · ${zone.occupied_spaces} ocupados${zone.unknown_spaces ? ` · ${zone.unknown_spaces} sin confirmar` : ""}`
              : `${zone.free_spaces} libres · ${zone.occupied_spaces} ocupados (estimación, sin plano vinculado)`}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-white/55">Aún no hay análisis operativo de esta zona.</p>
      )}
      <p className="mt-auto pt-5 text-xs text-white/55">
        {available ? `Revisada ${formatDateTime(zone.updated_at)}` : "Pendiente de revisión"}
      </p>
    </div>
  );
}

export default function DashboardPage({ onLogout }) {
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [parkingSummary, setParkingSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const applyData = ([parkingResult, analysisResult]) => {
    setParkingSummary(parkingResult.status === "fulfilled" ? parkingResult.value : null);
    setLatestAnalysis(analysisResult.status === "fulfilled" ? analysisResult.value : null);
    setLoadError(parkingResult.status === "rejected" || analysisResult.status === "rejected");
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    applyData(await fetchDashboardData());
    setIsRefreshing(false);
  };

  useEffect(() => {
    let active = true;
    fetchDashboardData().then((results) => {
      if (!active) return;
      const [parkingResult, analysisResult] = results;
      setParkingSummary(parkingResult.status === "fulfilled" ? parkingResult.value : null);
      setLatestAnalysis(analysisResult.status === "fulfilled" ? analysisResult.value : null);
      setLoadError(parkingResult.status === "rejected" || analysisResult.status === "rejected");
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const zones = parkingSummary?.zones ?? [];
  const locatedZones = zones.filter((zone) => zone.analysis_available && zone.location_assignment_available);
  const totals = locatedZones.reduce((sum, zone) => ({
    free: sum.free + (zone.free_spaces ?? 0),
    occupied: sum.occupied + (zone.occupied_spaces ?? 0),
    unknown: sum.unknown + (zone.unknown_spaces ?? 0),
  }), { free: 0, occupied: 0, unknown: 0 });
  const mostRecentReview = locatedZones.reduce((latest, zone) => {
    const timestamp = Date.parse(zone.updated_at ?? "") || 0;
    return timestamp > latest ? timestamp : latest;
  }, 0);
  const latestImageUrl = getStoredImageUrl(latestAnalysis?.image_url);
  const latestIsOperational = latestAnalysis?.analysis_mode === "yolo";

  return (
    <PageScaffold
      title="Dashboard"
      description="Estado del estacionamiento y última revisión de cada zona."
      module="dashboard"
      onLogout={onLogout}
    >
      <div className="space-y-9 text-white">
        <section aria-labelledby="dashboard-status-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="dashboard-status-title" className="text-lg font-bold">Disponibilidad actual</h2>
              <p className="mt-1 text-xs text-white/55">
                {locatedZones.length
                  ? `${locatedZones.length} de ${zones.length} zonas con espacios ubicados · revisión más reciente: ${formatDateTime(mostRecentReview)}`
                  : "Sin zonas con espacios ubicados y revisados"}
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={isLoading || isRefreshing}
              title="Actualizar estado"
              aria-label="Actualizar estado"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[.03] transition hover:bg-white/[.08] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          {loadError && !isLoading ? (
            <p role="alert" className="mt-4 text-sm text-rose-400">
              Algunos datos no se pudieron actualizar. Vuelve a intentarlo.
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
            <SummaryValue label="Libres" value={isLoading || !locatedZones.length ? "--" : totals.free} color="bg-emerald-500" primary />
            <SummaryValue label="Ocupados" value={isLoading || !locatedZones.length ? "--" : totals.occupied} color="bg-rose-500" />
            <SummaryValue label="Sin confirmar" value={isLoading || !locatedZones.length ? "--" : totals.unknown} color="bg-amber-400" />
          </div>
          {locatedZones.length > 0 && locatedZones.length < zones.length ? (
            <p className="mt-2 text-xs text-white/55">Los totales incluyen solo las zonas con ubicaciones vinculadas.</p>
          ) : null}
        </section>

        <section aria-labelledby="dashboard-zones-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="dashboard-zones-title" className="text-lg font-bold">Estado por zona</h2>
            <Link to="/parking-spaces" className="inline-flex items-center gap-1 text-sm font-semibold text-white/75 hover:text-white">
              Ver espacios <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {zones.length ? zones.map((zone) => <ZoneRow key={zone.id} zone={zone} />) : (
              <p className="py-5 text-sm text-white/55">{isLoading ? "Cargando zonas..." : "No se pudo consultar el estado de las zonas."}</p>
            )}
          </div>
        </section>

        <section aria-labelledby="dashboard-latest-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="dashboard-latest-title" className="text-lg font-bold">Último análisis</h2>
              <p className="mt-1 text-xs text-white/55">
                {latestAnalysis
                  ? `AN-${String(latestAnalysis.id_analisis).padStart(3, "0")} · Zona ${latestAnalysis.zone_code ?? "sin asignar"} · ${formatDateTime(latestAnalysis.fecha_analisis)}`
                  : isLoading ? "Cargando análisis..." : "Aún no hay análisis disponible"}
              </p>
            </div>
            <Link to="/analysis" className="inline-flex items-center gap-1 text-sm font-semibold text-white/75 hover:text-white">
              Ver historial <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 grid gap-5 rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 sm:p-6 md:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)] md:items-start">
            <div className="flex aspect-video max-h-[360px] items-center justify-center overflow-hidden rounded-md bg-white/[.04]">
              {latestImageUrl ? (
                <img src={latestImageUrl} alt={`Imagen del último análisis de la zona ${latestAnalysis.zone_code ?? "sin asignar"}`} className="h-full w-full object-contain" />
              ) : <ImageUp className="h-8 w-8 text-white/35" aria-hidden="true" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-white/55">Vehículos en esta imagen</p>
              <div className="mt-4 grid grid-cols-2 gap-5 border-b border-white/10 pb-5">
                <div>
                  <Car className="mb-2 h-5 w-5 text-white/55" aria-hidden="true" />
                  <p className="text-2xl font-bold tabular-nums">{latestIsOperational ? latestAnalysis.autos_detectados ?? 0 : "--"}</p>
                  <p className="mt-1 text-xs text-white/55">Autos</p>
                </div>
                <div>
                  <Bike className="mb-2 h-5 w-5 text-white/55" aria-hidden="true" />
                  <p className="text-2xl font-bold tabular-nums">{latestIsOperational ? latestAnalysis.motocicletas_detectadas ?? 0 : "--"}</p>
                  <p className="mt-1 text-xs text-white/55">Motocicletas</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-white/55">
                {latestIsOperational
                  ? "Detecciones de la última imagen; la disponibilidad se calcula por zona."
                  : "Sin detección operativa en el último registro."}
              </p>
              <Link to="/upload" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
                Cargar nueva imagen <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageScaffold>
  );
}
