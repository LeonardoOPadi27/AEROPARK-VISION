import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronDown,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import { getReportsOverview } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatSourceLabel = (value) => {
  if (value === "analisis") return "Analisis";
  if (value === "usuario") return "Usuario";
  return "Combinado";
};

const downloadCsv = (rows) => {
  const headers = [
    "Fecha",
    "Zona",
    "Espacio",
    "Estado",
    "Fuente",
    "Usuario",
    "Tiempo estimado",
    "Confirmacion",
    "Detalle",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [
        formatDateTime(row.timestamp),
        row.zone,
        row.space_code,
        row.status,
        row.source,
        row.user_name,
        row.estimated_hours,
        row.confirmation,
        row.detail,
      ]
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reporte-aeropark-vision.csv";
  link.click();
  URL.revokeObjectURL(url);
};

export default function ReportsPage({ onLogout }) {
  const [report, setReport] = useState(null);
  const [zoneFilter, setZoneFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setError("");
      try {
        const payload = await getReportsOverview();
        if (!mounted) return;
        setReport(payload);
      } catch {
        if (mounted) {
          setError("No se pudieron cargar los reportes operativos.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  const zoneOptions = report?.zones ?? [];

  const filteredRecords = useMemo(() => {
    const rows = report?.records ?? [];
    const now = Date.now();

    return rows.filter((row) => {
      const matchesZone =
        zoneFilter === "all" || row.zone === zoneOptions.find((zone) => zone.id === zoneFilter)?.title;
      const matchesSource = sourceFilter === "all" || row.source === sourceFilter;

      const rowDate = row.timestamp ? new Date(row.timestamp).getTime() : 0;
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" && now - rowDate <= 24 * 60 * 60 * 1000) ||
        (dateFilter === "week" && now - rowDate <= 7 * 24 * 60 * 60 * 1000);

      return matchesZone && matchesSource && matchesDate;
    });
  }, [dateFilter, report?.records, sourceFilter, zoneFilter, zoneOptions]);

  const chartPoints = report?.chart_points ?? [];
  const chartMax = Math.max(...chartPoints.map((item) => item.occupancy_percentage), 1);

  return (
    <PageScaffold
      title="Reportes"
      description="Resumen operativo del estacionamiento y del uso real de la app mobile dentro del ecosistema AeroPark Vision."
      module="reports"
      onLogout={onLogout}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/10 bg-[#0a0a0a] px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
              Centro de reportes
            </p>
            <h2 className="mt-1 text-lg font-black sm:text-xl">
              {report?.range_label ?? "Cargando rango"}
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-white/10 bg-[#0a0a0a] text-white/60">
            <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
            Cargando reportes...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                label="Analisis realizados"
                value={report.summary.total_analyses}
                meta="Procesamientos registrados"
                icon={FileSpreadsheet}
              />
              <SummaryCard
                label="Ocupacion promedio"
                value={`${report.summary.average_occupancy_percentage}%`}
                meta="Promedio del periodo"
                icon={CalendarRange}
              />
              <SummaryCard
                label="Libres promedio"
                value={report.summary.average_free_spaces}
                meta="Espacios libres estimados"
                icon={CalendarRange}
              />
              <SummaryCard
                label="Ocupados promedio"
                value={report.summary.average_occupied_spaces}
                meta="Espacios ocupados estimados"
                icon={CalendarRange}
              />
              <SummaryCard
                label="Ultima actualizacion"
                value={formatDateTime(report.summary.last_updated)}
                meta="Corte operativo mas reciente"
                icon={RefreshCw}
                compact
              />
            </div>

            <section className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
              <SectionTitle
                eyebrow="Zonas"
                title="Reporte por estacionamiento"
                description="Comparacion actual de disponibilidad entre las tres zonas de Tecsup."
              />
              <div className="grid gap-3 md:grid-cols-3">
                {report.zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="rounded-[22px] border border-white/10 bg-white/[.03] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                          {zone.id}
                        </p>
                        <h3 className="mt-1.5 text-base font-black">{zone.title}</h3>
                      </div>
                      <span className="shrink-0 rounded-xl border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] font-bold text-white/60">
                        {zone.occupancy_percentage}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/55">
                      Ultima revision: {formatDateTime(zone.last_review)}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
                      <Metric label="Libres" value={zone.free_spaces} compact />
                      <Metric label="Ocupados" value={zone.occupied_spaces} compact />
                      <Metric label="% actual" value={`${zone.occupancy_percentage}%`} compact />
                      <Metric
                        label="% prom."
                        value={`${zone.average_occupancy_percentage}%`}
                        compact
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
                <SectionTitle
                  eyebrow="Mobile"
                  title="Uso de la app"
                  description="Indicadores de ocupacion y liberacion manual reportados por usuarios."
                  icon={Smartphone}
                />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Metric label="Ocupaciones manuales" value={report.mobile_usage.manual_occupations} />
                  <Metric label="Liberaciones" value={report.mobile_usage.manual_releases} />
                  <Metric label="Activos ahora" value={report.mobile_usage.active_user_spaces} />
                  <Metric
                    label="Vencidos sin confirmar"
                    value={report.mobile_usage.expired_without_confirmation}
                  />
                  <Metric
                    label="Tiempo promedio"
                    value={`${report.mobile_usage.average_estimated_hours} h`}
                  />
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
                <SectionTitle
                  eyebrow="Consistencia"
                  title="Cruce analisis vs usuario"
                  description="Indicadores para evaluar que tan alineados estan los reportes manuales con la ultima revision del sistema."
                  icon={ShieldCheck}
                />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Metric
                    label="Ocupados detectados"
                    value={report.consistency.analysis_detected_occupied}
                  />
                  <Metric
                    label="Activos manuales"
                    value={report.consistency.manual_active_reports}
                  />
                  <Metric
                    label="Diferencia"
                    value={report.consistency.difference_count}
                  />
                  <Metric
                    label="Coincidencia"
                    value={`${report.consistency.agreement_percentage}%`}
                  />
                  <Metric
                    label="Pendientes"
                    value={report.consistency.pending_confirmation}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
              <SectionTitle
                eyebrow="Tendencia"
                title="Evolucion de ocupacion"
                description="Ultimos analisis procesados para observar el comportamiento reciente del estacionamiento."
              />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {chartPoints.map((point) => (
                  <div key={point.id} className="rounded-[22px] bg-white/[.03] p-3.5">
                    <div className="mb-2.5 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{point.label}</p>
                        <p className="text-xs text-white/45">{point.zone}</p>
                      </div>
                      <span className="text-sm font-black text-white/75">
                        {point.occupancy_percentage}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white"
                        style={{
                          width: `${(point.occupancy_percentage / chartMax) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2.5 text-xs text-white/55">
                      {point.occupied_spaces} ocupados · {point.free_spaces} libres
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {formatDateTime(point.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                    Registros
                  </p>
                  <h2 className="mt-1 text-lg font-black">Tabla operativa</h2>
                  <p className="mt-1.5 text-sm text-white/52">
                    Entradas combinadas del sistema de analisis y de la app mobile.
                  </p>
                </div>
                <span className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-white/60">
                  {filteredRecords.length} registros
                </span>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <FilterSelect value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  <option value="all">Todo el periodo</option>
                  <option value="today">Ultimas 24h</option>
                  <option value="week">Ultimos 7 dias</option>
                </FilterSelect>
                <FilterSelect value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
                  <option value="all">Todas las zonas</option>
                  {zoneOptions.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.title}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option value="all">Todas las fuentes</option>
                  <option value="analisis">Analisis</option>
                  <option value="usuario">Usuario</option>
                </FilterSelect>
                <button
                  type="button"
                  onClick={() => downloadCsv(filteredRecords)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-white transition hover:bg-white/[.08]"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-white/45">
                    <tr className="border-b border-white/10">
                      <th className="px-2.5 py-2.5 font-semibold">Fecha</th>
                      <th className="px-2.5 py-2.5 font-semibold">Zona</th>
                      <th className="px-2.5 py-2.5 font-semibold">Espacio</th>
                      <th className="px-2.5 py-2.5 font-semibold">Estado</th>
                      <th className="px-2.5 py-2.5 font-semibold">Fuente</th>
                      <th className="px-2.5 py-2.5 font-semibold">Usuario</th>
                      <th className="px-2.5 py-2.5 font-semibold">Tiempo</th>
                      <th className="px-2.5 py-2.5 font-semibold">Confirmacion</th>
                      <th className="px-2.5 py-2.5 font-semibold">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 align-top">
                        <td className="px-2.5 py-2.5 text-white/75">{formatDateTime(row.timestamp)}</td>
                        <td className="px-2.5 py-2.5">{row.zone}</td>
                        <td className="px-2.5 py-2.5">{row.space_code}</td>
                        <td className="px-2.5 py-2.5">
                          <span className="rounded-xl border border-white/10 bg-white/[.03] px-2 py-1 text-[11px] font-bold">
                            {row.status}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5 text-white/65">
                          {formatSourceLabel(row.source)}
                        </td>
                        <td className="px-2.5 py-2.5 text-white/75">{row.user_name}</td>
                        <td className="px-2.5 py-2.5 text-white/75">{row.estimated_hours}</td>
                        <td className="px-2.5 py-2.5 text-white/75">{row.confirmation}</td>
                        <td className="px-2.5 py-2.5 text-white/55">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </PageScaffold>
  );
}

function SummaryCard({ label, value, meta, icon: Icon, compact = false }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0a0a0a] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
          {label}
        </p>
        {Icon ? <Icon className="h-4 w-4 text-white/35" /> : null}
      </div>
      <p className={compact ? "text-base font-black leading-tight" : "text-2xl font-black leading-tight"}>
        {value}
      </p>
      <p className="mt-1.5 text-xs text-white/52">{meta}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, icon: Icon }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-lg font-black">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-white/52">{description}</p>
      </div>
      {Icon ? <Icon className="mt-1 h-5 w-5 shrink-0 text-white/35" /> : null}
    </div>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <div className={`rounded-[18px] bg-white/[.03] ${compact ? "p-2.5" : "p-3"}`}>
      <p
        className={`text-white/40 ${
          compact
            ? "text-[10px] font-black uppercase tracking-[.12em] leading-4"
            : "text-xs font-black uppercase tracking-[.16em]"
        }`}
      >
        {label}
      </p>
      <p className={`font-black ${compact ? "mt-1 text-sm" : "mt-1.5 text-base"}`}>
        {value}
      </p>
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none rounded-xl border border-white/10 bg-white/[.03] py-2 pl-3 pr-9 text-xs text-white outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
    </div>
  );
}
