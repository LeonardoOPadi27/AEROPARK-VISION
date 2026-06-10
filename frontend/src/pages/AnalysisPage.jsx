import { useEffect, useState } from "react";
import { BarChart3, Cpu, RefreshCw } from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import { getAnalyses, getYoloStatus, runAnalysis } from "../services/api";

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

export default function AnalysisPage({ onLogout }) {
  const [rows, setRows] = useState([]);
  const [yoloStatus, setYoloStatus] = useState(null);
  const [runningImageId, setRunningImageId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [analysisData, statusData] = await Promise.all([
        getAnalyses(),
        getYoloStatus(),
      ]);
      setRows(analysisData);
      setYoloStatus(statusData);
    } catch {
      setError("No se pudieron cargar los análisis.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isMounted) return;
      await loadData();
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRunAnalysis = async (imageId) => {
    setRunningImageId(imageId);
    try {
      await runAnalysis(imageId);
      await loadData();
    } catch {
      setError("No se pudo ejecutar el análisis para esa imagen.");
    } finally {
      setRunningImageId(null);
    }
  };

  return (
    <PageScaffold
      title="Análisis de imágenes"
      description="Aquí ya se muestran los análisis generados a partir de las imágenes subidas. Cuando YOLO esté listo, esta misma vista reflejará el procesamiento real del modelo."
      module="analysis"
      onLogout={onLogout}
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                Runtime IA
              </p>
              <h2 className="mt-1 text-xl font-black">Estado de YOLO</h2>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${
                yoloStatus?.ready
                  ? "border-white/10 bg-white/[.08] text-white"
                  : "border-white/10 bg-white/[.03] text-white/70"
              }`}
            >
              <Cpu className="h-4 w-4" />
              {yoloStatus?.ready ? "YOLO activo" : "Modo mock"}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/[.03] p-4">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-white/45">
                Modo actual
              </p>
              <p className="mt-2 text-base font-black">{yoloStatus?.mode ?? "--"}</p>
            </div>
            <div className="rounded-2xl bg-white/[.03] p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-white/45">
                Estado
              </p>
              <p className="mt-2 text-sm font-semibold text-white/75">
                {yoloStatus?.reason ?? "Cargando estado del modelo..."}
              </p>
              <p className="mt-2 truncate text-xs text-white/40">
                {yoloStatus?.weights_path ?? ""}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                Registros
              </p>
              <h2 className="mt-1 text-xl font-black">
                Historial de análisis
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-white/70">
              <BarChart3 className="h-4 w-4" />
              {rows.length} análisis
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-white/60">
              <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
              Cargando análisis...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-white/[.03] px-4 py-10 text-center text-white/55">
              Aún no hay imágenes analizadas.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03]">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[.8fr_1.5fr_.9fr_.9fr_1fr_.9fr_1fr] bg-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[.14em] text-white/60">
                  <span>ID</span>
                  <span>Imagen</span>
                  <span>Vehículos</span>
                  <span>Ocupación</span>
                  <span>Precisión</span>
                  <span>Modo</span>
                  <span>Acción</span>
                </div>
                {rows.map((row) => (
                  <div
                    key={row.id_analisis}
                    className="grid grid-cols-[.8fr_1.5fr_.9fr_.9fr_1fr_.9fr_1fr] items-center border-t border-white/10 px-4 py-4 text-sm font-semibold"
                  >
                    <span>AN-{String(row.id_analisis).padStart(3, "0")}</span>
                    <div>
                      <p className="truncate">{row.image_name ?? `Imagen ${row.id_imagen}`}</p>
                      <p className="text-xs text-white/45">
                        {formatDateTime(row.fecha_analisis)}
                      </p>
                    </div>
                    <div>
                      <p>{row.total_vehiculos ?? row.vehiculos_detectados}</p>
                      <p className="text-xs text-white/45">
                        {row.autos_detectados ?? row.vehiculos_detectados} autos · {row.motocicletas_detectadas ?? 0} motos
                      </p>
                    </div>
                    <span>{row.porcentaje_ocupacion}%</span>
                    <span>{row.precision_modelo ?? "--"}%</span>
                    <span
                      className={
                        row.analysis_mode === "yolo"
                          ? "text-white/45"
                          : "text-white/60"
                      }
                    >
                      {row.analysis_mode}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRunAnalysis(row.id_imagen)}
                      disabled={runningImageId === row.id_imagen}
                      className="rounded-2xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-black text-white/80 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {runningImageId === row.id_imagen ? "Ejecutando..." : "Reintentar"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageScaffold>
  );
}
