import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown, CircleHelp, Download, ParkingSquare, RefreshCw } from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import { getReportsOverview } from "../services/api";

const formatDateTime = (value) => {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const formatPercentage = (value) => typeof value === "number" ? `${value}%` : "--";
const formatSource = (value) => value === "analisis" ? "Análisis" : "Estudiante";

const downloadCsv = (rows) => {
  const headers = ["Fecha", "Zona", "Espacio", "Estado", "Fuente", "Usuario", "Tiempo estimado", "Confirmación", "Detalle"];
  const values = rows.map((row) => [
    formatDateTime(row.timestamp), row.zone, row.space_code, row.status, row.source,
    row.user_name, row.estimated_hours, row.confirmation, row.detail,
  ].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","));
  const blob = new Blob([[headers.join(","), ...values].join("\n")], { type: "text/csv;charset=utf-8;" });
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
    getReportsOverview()
      .then((payload) => { if (mounted) setReport(payload); })
      .catch(() => { if (mounted) setError("No se pudieron cargar los reportes operativos."); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const zones = useMemo(() => report?.zones ?? [], [report?.zones]);
  const reportNow = report?.generated_at ? new Date(report.generated_at).getTime() : 0;
  const filteredRecords = (report?.records ?? []).filter((row) => {
    const matchesZone = zoneFilter === "all" || row.zone === zones.find((zone) => zone.id === zoneFilter)?.title;
    const matchesSource = sourceFilter === "all" || row.source === sourceFilter;
    const age = reportNow - (row.timestamp ? new Date(row.timestamp).getTime() : 0);
    const matchesDate = dateFilter === "all" || (
      age >= 0 && age <= (dateFilter === "today" ? 1 : 7) * 24 * 60 * 60 * 1000
    );
    return matchesZone && matchesSource && matchesDate;
  });
  const reviewedZones = zones.filter((zone) => zone.analysis_available);
  const totals = reviewedZones.reduce((sum, zone) => ({
    free: sum.free + (zone.free_spaces ?? 0),
    occupied: sum.occupied + (zone.occupied_spaces ?? 0),
    unknown: sum.unknown + (zone.unknown_spaces ?? 0),
    capacity: sum.capacity + zone.total_spaces,
  }), { free: 0, occupied: 0, unknown: 0, capacity: 0 });

  return (
    <PageScaffold
      title="Reportes"
      description="Disponibilidad actual, revisiones por zona y registros del estacionamiento."
      module="reports"
      onLogout={onLogout}
    >
      <div className="space-y-8 text-white">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center text-white/60">
            <RefreshCw className="mr-3 h-5 w-5 animate-spin" /> Cargando reportes...
          </div>
        ) : error ? (
          <div className="rounded border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>
        ) : (
          <>
            <section aria-labelledby="report-current-title">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="report-current-title" className="text-lg font-black">Disponibilidad actual</h2>
                  <p className="mt-1 text-xs text-white/55">
                    {reviewedZones.length === zones.length
                      ? `${totals.capacity} espacios en zonas A y B`
                      : `${reviewedZones.length} de ${zones.length} zonas con análisis`}
                  </p>
                </div>
                <p className="text-xs text-white/55">Última revisión: {formatDateTime(report.summary.last_updated)}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 border-y border-white/10 py-5 lg:grid-cols-4">
                <ReportCount icon={ParkingSquare} label="Libres" value={reviewedZones.length ? totals.free : "--"} primary />
                <ReportCount label="Ocupados" value={reviewedZones.length ? totals.occupied : "--"} />
                <ReportCount icon={CircleHelp} label="Sin confirmar" value={reviewedZones.length ? totals.unknown : "--"} />
                <ReportCount icon={BarChart3} label="Análisis registrados" value={report.summary.total_analyses} />
              </div>
            </section>

            <section aria-labelledby="report-zones-title">
              <h2 id="report-zones-title" className="text-lg font-black">Estado por zona</h2>
              <div className="mt-3 border-t border-white/10">
                {zones.map((zone) => <ZoneReportRow key={zone.id} zone={zone} />)}
              </div>
            </section>

            <section aria-labelledby="report-analysis-title">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 id="report-analysis-title" className="text-lg font-black">Últimos análisis</h2>
                <span className="text-xs text-white/55">{report.range_label}</span>
              </div>
              <div className="mt-3 border-t border-white/10">
                {report.chart_points.length ? report.chart_points.map((point) => (
                  <div key={point.id} className="grid gap-2 border-b border-white/10 py-3 text-sm sm:grid-cols-[110px_minmax(130px,1fr)_minmax(120px,2fr)_60px] sm:items-center sm:gap-4">
                    <span className="font-bold">{point.label} · {point.zone}</span>
                    <span className="text-xs text-white/55">{formatDateTime(point.timestamp)}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                      <div className="h-full bg-rose-500" style={{ width: `${Math.min(Math.max(point.occupancy_percentage, 0), 100)}%` }} />
                    </div>
                    <strong className="text-right tabular-nums">{formatPercentage(point.occupancy_percentage)}</strong>
                  </div>
                )) : <p className="py-5 text-sm text-white/55">Aún no hay análisis registrados.</p>}
              </div>
            </section>

            <section aria-labelledby="report-activity-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="report-activity-title" className="text-lg font-black">Actividad de espacios</h2>
                  <p className="mt-1 text-xs text-white/55">
                    {report.mobile_usage.active_user_spaces} espacios marcados desde la app
                    {report.mobile_usage.expired_without_confirmation > 0
                      ? ` · ${report.mobile_usage.expired_without_confirmation} pendientes de confirmación`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-white/55">{filteredRecords.length} registros</span>
              </div>
              <div className="my-4 flex flex-wrap items-center gap-2">
                <FilterSelect label="Periodo" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  <option value="all">Todo el periodo</option>
                  <option value="today">Últimas 24 h</option>
                  <option value="week">Últimos 7 días</option>
                </FilterSelect>
                <FilterSelect label="Zona" value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
                  <option value="all">Todas las zonas</option>
                  {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.title}</option>)}
                </FilterSelect>
                <FilterSelect label="Fuente" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option value="all">Todas las fuentes</option>
                  <option value="analisis">Análisis</option>
                  <option value="usuario">Estudiante</option>
                </FilterSelect>
                <button
                  type="button"
                  onClick={() => downloadCsv(filteredRecords)}
                  disabled={!filteredRecords.length}
                  className="inline-flex items-center gap-2 rounded border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-white transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> Exportar CSV
                </button>
              </div>
              <div className="overflow-x-auto border-t border-white/10">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-white/55">
                    <tr className="border-b border-white/10">
                      <th className="px-2 py-3 font-semibold">Fecha</th>
                      <th className="px-2 py-3 font-semibold">Zona</th>
                      <th className="px-2 py-3 font-semibold">Estado</th>
                      <th className="px-2 py-3 font-semibold">Espacio</th>
                      <th className="px-2 py-3 font-semibold">Fuente</th>
                      <th className="px-2 py-3 font-semibold">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((row) => (
                      <tr key={row.id} className="border-b border-white/10 align-top">
                        <td className="whitespace-nowrap px-2 py-3 text-white/70">{formatDateTime(row.timestamp)}</td>
                        <td className="px-2 py-3">{row.zone}</td>
                        <td className="px-2 py-3 font-semibold">{row.status}</td>
                        <td className="px-2 py-3 tabular-nums">{row.space_code}</td>
                        <td className="px-2 py-3 text-white/70">{formatSource(row.source)}</td>
                        <td className="px-2 py-3 text-white/70">
                          {row.detail}
                          {row.confirmation && !["-", "sin vencimiento"].includes(row.confirmation)
                            ? <span className="block text-xs text-white/55">Confirmación: {row.confirmation}</span>
                            : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredRecords.length ? <p className="py-6 text-sm text-white/55">No hay registros para estos filtros.</p> : null}
              </div>
            </section>
          </>
        )}
      </div>
    </PageScaffold>
  );
}

function ReportCount({ icon: Icon, label, value, primary = false }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-xs font-bold text-white/55">
        {Icon ? <Icon className="h-4 w-4" /> : null}{label}
      </p>
      <p className={`mt-2 font-black leading-none tabular-nums ${primary ? "text-4xl" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

function ZoneReportRow({ zone }) {
  const total = zone.total_spaces || 1;
  const segments = [
    { label: "libres", count: zone.free_spaces ?? 0, color: "bg-emerald-500" },
    { label: "ocupados", count: zone.occupied_spaces ?? 0, color: "bg-rose-500" },
    { label: "sin confirmar", count: zone.unknown_spaces ?? 0, color: "bg-amber-400" },
  ];
  return (
    <div className="grid gap-4 border-b border-white/10 py-5 lg:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_minmax(160px,1fr)] lg:items-center">
      <div>
        <h3 className="font-black">Zona {zone.id}</h3>
        <p className="mt-1 text-xs text-white/55">{zone.total_spaces} espacios · {formatDateTime(zone.last_review)}</p>
      </div>
      {zone.analysis_available ? (
        <div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" aria-label={`Zona ${zone.id}: ${segments.map((item) => `${item.count} ${item.label}`).join(", ")}`}>
            {segments.map((item) => <span key={item.label} className={item.color} style={{ width: `${item.count / total * 100}%` }} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
            {segments.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${item.color}`} />{item.count} {item.label}
              </span>
            ))}
          </div>
        </div>
      ) : <p className="text-sm text-white/55">Sin análisis de esta zona</p>}
      <p className="text-left text-lg font-black tabular-nums lg:text-right">
        {formatPercentage(zone.occupancy_percentage)}
        <span className="ml-2 text-xs font-semibold text-white/55">ocupación</span>
      </p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className="appearance-none rounded border border-white/10 bg-white/[.03] py-2 pl-3 pr-9 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
    </div>
  );
}
