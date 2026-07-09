import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bike,
  Car,
  CheckCircle2,
  ParkingSquare,
  TrendingUp,
} from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import CountUp from "../components/CountUp";
import {
  API_BASE_URL,
  getAnalyses,
  getLatestAnalysis,
  getMobileParkingOverview,
} from "../services/api";

const colorPalette = {
  Negro: "#111827",
  Gris: "#9ca3af",
  Plateado: "#cbd5e1",
  Blanco: "#f8fafc",
  Rojo: "#ef4444",
  Naranja: "#f97316",
  Amarillo: "#eab308",
  Azul: "#2563eb",
  Verde: "#22c55e",
  Otro: "#64748b",
};

const getStoredImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
};

const formatDateTime = (value) => {
  if (!value) return "Pendiente";

  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

function MetricCard({ label, value, icon: Icon, suffix = "" }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-white/45">{label}</p>
        <Icon className="h-4 w-4 text-white/40" />
      </div>
      <p className="text-2xl font-semibold tabular-nums tracking-[-.02em]">
        <CountUp from={0} to={Number(value) || 0} separator="," duration={2.4} />
        {suffix}
      </p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-floating-tooltip rounded-2xl px-3 py-2 text-sm shadow-2xl">
      <p className="text-white/45">{label}</p>
      <p className="font-medium text-white">{payload[0].value} vehículos</p>
    </div>
  );
}

function OccupancyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];

  return (
    <div className="occupancy-floating-tooltip">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: item.payload.color }}
      />
      <div>
        <p className="text-xs text-white/48">{item.name}</p>
        <p className="text-sm font-semibold tabular-nums text-white">
          {item.value}%
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage({ onLogout }) {
  const [timeMode, setTimeMode] = useState("analysis");
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [parkingSummary, setParkingSummary] = useState(null);
  const [analysisRows, setAnalysisRows] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [latestData, parkingData, rowsData] = await Promise.all([
          getLatestAnalysis(),
          getMobileParkingOverview(),
          getAnalyses(),
        ]);
        if (!isMounted) return;
        setLatestAnalysis(latestData);
        setParkingSummary(parkingData);
        setAnalysisRows(rowsData);
      } catch {
        if (!isMounted) return;
        setLatestAnalysis(null);
        setParkingSummary(null);
        setAnalysisRows([]);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const vehicleTrend = useMemo(() => {
    if (!analysisRows.length) return [];

    if (timeMode === "day") {
      const grouped = analysisRows.reduce((acc, row) => {
        const label = row.fecha_analisis
          ? new Intl.DateTimeFormat("es-PE", {
              day: "2-digit",
              month: "2-digit",
            }).format(new Date(row.fecha_analisis))
          : "Sin fecha";
        acc[label] =
          (acc[label] ?? 0) +
          (row.total_vehiculos ?? row.vehiculos_detectados ?? 0);
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([hora, autos]) => ({ hora, autos }))
        .slice(-8);
    }

    return [...analysisRows]
      .reverse()
      .slice(-10)
      .map((row) => ({
        hora: row.fecha_analisis
          ? new Intl.DateTimeFormat("es-PE", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(row.fecha_analisis))
          : `AN-${row.id_analisis}`,
        autos: row.total_vehiculos ?? row.vehiculos_detectados ?? 0,
      }));
  }, [analysisRows, timeMode]);

  const latestImageUrl = getStoredImageUrl(latestAnalysis?.image_url);
  const autosCount =
    latestAnalysis?.autos_detectados ?? latestAnalysis?.vehiculos_detectados ?? 0;
  const motorcyclesCount = latestAnalysis?.motocicletas_detectadas ?? 0;
  const totalVehicles =
    latestAnalysis?.total_vehiculos ??
    latestAnalysis?.vehiculos_detectados ??
    autosCount + motorcyclesCount;
  const occupied =
    parkingSummary?.occupied_spaces ?? latestAnalysis?.espacios_ocupados ?? 0;
  const free = parkingSummary?.free_spaces ?? latestAnalysis?.espacios_libres ?? 0;
  const totalSpaces = parkingSummary?.total_spaces ?? occupied + free;
  const occupancyPercent = parkingSummary
    ? totalSpaces
      ? Number(((occupied / totalSpaces) * 100).toFixed(1))
      : 0
    : latestAnalysis?.porcentaje_ocupacion ?? 0;
  const manualMarkedCount =
    parkingSummary?.zones?.reduce(
      (total, zone) =>
        total +
        zone.spaces.filter((space) => space.status === "user_occupied").length,
      0,
    ) ?? 0;
  const occupancySourceLabel =
    parkingSummary?.source === "polygon_map"
      ? manualMarkedCount
        ? "Mapa por polígonos + app mobile"
        : "Mapa por polígonos"
      : manualMarkedCount
        ? "Estimación YOLO + app mobile"
        : "Estimación YOLO";
  const occupancyData = [
    { name: "Ocupados", value: occupancyPercent, color: "var(--occupancy-occupied-dot)" },
    {
      name: "Libres",
      value: Math.max(0, Number((100 - occupancyPercent).toFixed(1))),
      color: "var(--occupancy-free-dot)",
    },
  ];
  const colorRows = latestAnalysis?.color_distribution ?? [];
  const maxColor = Math.max(...colorRows.map((item) => item.cantidad), 1);

  return (
    <PageScaffold
      title="Dashboard"
      description="Resumen operativo del último análisis, ocupación calculada y comportamiento reciente del estacionamiento."
      module="dashboard"
      onLogout={onLogout}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Autos detectados" value={autosCount} icon={Car} />
          <MetricCard label="Motocicletas" value={motorcyclesCount} icon={Bike} />
          <MetricCard label="Total vehículos" value={totalVehicles} icon={TrendingUp} />
          <MetricCard label="Espacios libres" value={free} icon={ParkingSquare} />
          <MetricCard label="Espacios ocupados" value={occupied} icon={CheckCircle2} />
          <MetricCard
            label="Precisión modelo"
            value={latestAnalysis?.precision_modelo ?? 0}
            suffix="%"
            icon={TrendingUp}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-12 xl:items-start">
          <section className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 xl:col-span-8 xl:row-start-1">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-[-.02em]">
                  Vehículos detectados
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  Historial real de análisis procesados.
                </p>
              </div>
              <div className="liquid-segmented-control relative inline-grid w-[150px] grid-cols-2 rounded-full p-1 text-xs font-medium">
                <span
                  aria-hidden="true"
                  className={`liquid-segmented-thumb absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full ${
                    timeMode === "day"
                      ? "translate-x-[calc(100%+4px)]"
                      : "translate-x-1"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setTimeMode("analysis")}
                  className={`liquid-segmented-option relative z-10 rounded-full px-3 py-2 transition-colors duration-300 ${
                    timeMode === "analysis"
                      ? "liquid-segmented-option-active text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Análisis
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode("day")}
                  className={`liquid-segmented-option relative z-10 rounded-full px-3 py-2 transition-colors duration-300 ${
                    timeMode === "day"
                      ? "liquid-segmented-option-active text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Día
                </button>
              </div>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={vehicleTrend}
                  margin={{ top: 10, right: 12, left: -24, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="vehicleFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--chart-vehicle-fill)"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-vehicle-fill)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hora"
                    tick={{ fill: "var(--chart-axis-color)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, "dataMax + 5"]}
                    tick={{ fill: "var(--chart-muted-axis-color)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="autos"
                    stroke="var(--chart-vehicle-line)"
                    strokeWidth={2.4}
                    fill="url(#vehicleFill)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "var(--chart-active-dot-fill)",
                      stroke: "var(--chart-active-dot-stroke)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <aside className="contents">
            <section className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 xl:col-span-4 xl:col-start-9 xl:row-start-1">
              <div className="mb-3">
                <h2 className="text-lg font-semibold tracking-[-.02em]">
                  Ocupación
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  {occupancySourceLabel}
                </p>
              </div>
              <div className="occupancy-donut-3d relative mx-auto h-[210px] max-w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <linearGradient id="occupied3d" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--occupancy-occupied-start)" />
                        <stop offset="55%" stopColor="var(--occupancy-occupied-mid)" />
                        <stop offset="100%" stopColor="var(--occupancy-occupied-end)" />
                      </linearGradient>
                      <linearGradient id="free3d" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--occupancy-free-start)" />
                        <stop offset="55%" stopColor="var(--occupancy-free-mid)" />
                        <stop offset="100%" stopColor="var(--occupancy-free-end)" />
                      </linearGradient>
                      <filter id="donutGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <Pie
                      data={occupancyData}
                      dataKey="value"
                      innerRadius="66%"
                      outerRadius="88%"
                      startAngle={225}
                      endAngle={-135}
                      paddingAngle={4}
                      cornerRadius={7}
                      cy="54%"
                      isAnimationActive={false}
                    >
                      {occupancyData.map((entry) => (
                        <Cell
                          key={`base-${entry.name}`}
                          fill={entry.name === "Ocupados" ? "transparent" : "var(--occupancy-base-free)"}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Pie
                      data={occupancyData}
                      dataKey="value"
                      innerRadius="66%"
                      outerRadius="88%"
                      startAngle={225}
                      endAngle={-135}
                      paddingAngle={4}
                      cornerRadius={7}
                      cy="50%"
                      filter="url(#donutGlow)"
                    >
                      {occupancyData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={index === 0 ? "url(#occupied3d)" : "url(#free3d)"}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<OccupancyTooltip />}
                      cursor={false}
                      wrapperStyle={{ outline: "none", zIndex: 20 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {occupancyData.map((item) => (
                  <div key={item.name} className="rounded-2xl bg-white/[.03] p-3">
                    <p className="text-white/45">{item.name}</p>
                    <p className="mt-1 font-semibold">{item.value}%</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 xl:col-span-4 xl:col-start-9 xl:row-start-2">
              <h2 className="text-lg font-semibold tracking-[-.02em]">
                Última imagen
              </h2>
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
                {latestImageUrl ? (
                  <img
                    src={latestImageUrl}
                    alt="Última imagen analizada"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-white/35">
                    Sin análisis disponible
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-white/45">
                {latestAnalysis
                  ? `AN-${String(latestAnalysis.id_analisis).padStart(3, "0")} · ${formatDateTime(latestAnalysis.fecha_analisis)}`
                  : "Pendiente"}
              </p>
            </section>
          </aside>

        <section className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5 xl:col-span-8 xl:row-start-2">
          <h2 className="text-lg font-semibold tracking-[-.02em]">
            Colores del último análisis
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {colorRows.map((item) => {
              const swatch = colorPalette[item.color] ?? colorPalette.Otro;
              return (
                <div key={item.color}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span
                        className="h-3 w-3 rounded-2xl border border-white/20"
                        style={{ backgroundColor: swatch }}
                      />
                      {item.color}
                    </span>
                    <span className="text-white/45">{item.cantidad}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-2xl bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.cantidad / maxColor) * 100}%`,
                        backgroundColor: swatch,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>
      </div>
    </PageScaffold>
  );
}
