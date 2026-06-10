import { useEffect, useMemo, useState } from "react";
import { BarChart3, ImageIcon, RefreshCw } from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import {
  API_BASE_URL,
  getAnalyses,
  getLatestVehicleColorSummary,
  getVehicleColorSummary,
} from "../services/api";

const getStoredImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
};

const colorSwatches = {
  Negro: "#111827",
  Blanco: "#f8fafc",
  Gris: "#9ca3af",
  Plateado: "#cbd5e1",
  Rojo: "#ef4444",
  Naranja: "#f97316",
  Amarillo: "#eab308",
  "Verde claro": "#84cc16",
  Verde: "#22c55e",
  Cian: "#06b6d4",
  Azul: "#2563eb",
  Morado: "#9333ea",
  Rosado: "#ec4899",
  Marrón: "#92400e",
  Beige: "#d6b98c",
  Otro: "#64748b",
};

export default function VehicleColorsPage({ onLogout }) {
  const [summary, setSummary] = useState(null);
  const [latestSummary, setLatestSummary] = useState(null);
  const [analysisRows, setAnalysisRows] = useState([]);
  const [scope, setScope] = useState("latest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadColors = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [globalData, latestData, rowsData] = await Promise.all([
          getVehicleColorSummary(),
          getLatestVehicleColorSummary(),
          getAnalyses(),
        ]);

        if (!isMounted) return;
        setSummary(globalData);
        setLatestSummary(latestData);
        setAnalysisRows(rowsData);
      } catch {
        if (isMounted) {
          setError("No se pudo cargar la clasificación por color.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadColors();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeSummary = scope === "latest" ? latestSummary : summary;
  const colors = activeSummary?.colors ?? [];
  const maxCount = useMemo(
    () => Math.max(...colors.map((item) => item.count), 1),
    [colors],
  );
  const analysisColorRows = useMemo(
    () =>
      analysisRows.map((row) => {
        const distribution = row.color_distribution ?? [];
        const total = distribution.reduce(
          (sum, item) => sum + (item.cantidad ?? 0),
          0,
        );

        return {
          ...row,
          color_distribution: distribution,
          color_total: total,
          max_color_count: Math.max(
            ...distribution.map((item) => item.cantidad ?? 0),
            1,
          ),
        };
      }),
    [analysisRows],
  );

  return (
    <PageScaffold
      title="Clasificación por color"
      description="Resumen real de colores detectados en los vehículos identificados por YOLO."
      module="colors"
      onLogout={onLogout}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0a0a0a] p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
              Vehículos detectados
            </p>
            <h2 className="mt-1 text-xl font-black">
              {activeSummary?.total_vehicles ?? 0} registros por color
            </h2>
          </div>
          <div className="liquid-segmented-control relative inline-grid w-[170px] grid-cols-2 rounded-full p-1 text-xs font-medium">
            <span
              aria-hidden="true"
              className={`liquid-segmented-thumb absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full ${
                scope === "global"
                  ? "translate-x-[calc(100%+4px)]"
                  : "translate-x-1"
              }`}
            />
            <button
              type="button"
              onClick={() => setScope("latest")}
              className={`liquid-segmented-option relative z-10 rounded-full px-3 py-2 transition-colors duration-300 ${
                scope === "latest"
                  ? "liquid-segmented-option-active text-black"
                  : "text-white/65 hover:text-white"
              }`}
            >
              Último
            </button>
            <button
              type="button"
              onClick={() => setScope("global")}
              className={`liquid-segmented-option relative z-10 rounded-full px-3 py-2 transition-colors duration-300 ${
                scope === "global"
                  ? "liquid-segmented-option-active text-black"
                  : "text-white/65 hover:text-white"
              }`}
            >
              Global
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-white/10 bg-[#0a0a0a] text-white/60">
            <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
            Cargando colores...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </div>
        ) : colors.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] px-4 py-12 text-center text-white/55">
            Aún no hay vehículos con color detectado.
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {colors.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5"
                  >
                    <span
                      className="mb-5 block h-10 w-10 rounded-2xl border border-white/10"
                      style={{ backgroundColor: item.swatch }}
                    />
                    <p className="text-3xl font-black">{item.count}</p>
                    <p className="mt-2 text-base font-bold text-white/65">
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5">
                <div className="mb-5 flex items-center gap-2 text-sm font-black text-white/75">
                  <BarChart3 className="h-5 w-5 text-white/45" />
                  Distribución
                </div>
                <div className="space-y-4">
                  {colors.map((item) => (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between text-sm font-bold">
                        <span>{item.name}</span>
                        <span className="text-white/55">{item.count}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-2xl bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.count / maxCount) * 100}%`,
                            backgroundColor: item.swatch,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                    Registros
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    Colores por imagen analizada
                  </h2>
                </div>
                <span className="rounded-2xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-bold text-white/60">
                  {analysisColorRows.length} imágenes
                </span>
              </div>

              <div className="grid gap-4">
                {analysisColorRows.map((row) => (
                  <article
                    key={row.id_analisis}
                    className="grid gap-4 rounded-2xl bg-white/[.03] p-4 lg:grid-cols-[180px_1fr]"
                  >
                    <div className="aspect-video overflow-hidden rounded-2xl bg-white/[.03]">
                      {row.image_url ? (
                        <img
                          src={getStoredImageUrl(row.image_url)}
                          alt={row.image_name ?? `Imagen ${row.id_imagen}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-white/35">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-black">
                            {row.image_name ?? `Imagen ${row.id_imagen}`}
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-white/45">
                            AN-{String(row.id_analisis).padStart(3, "0")} ·{" "}
                            {row.color_total} vehículos con color
                          </p>
                        </div>
                        <span className="rounded-2xl border border-white/10 bg-white/[.03] px-3 py-1 text-xs font-black text-white">
                          {row.analysis_mode}
                        </span>
                      </div>

                      {row.color_distribution.length === 0 ? (
                        <p className="rounded-2xl border border-white/10 bg-black px-3 py-4 text-sm font-semibold text-white/45">
                          Sin colores registrados para esta imagen.
                        </p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          {row.color_distribution.map((item) => {
                            const color = item.color ?? "Otro";
                            const swatch =
                              colorSwatches[color] ?? colorSwatches.Otro;

                            return (
                              <div key={color}>
                                <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className="h-3 w-3 rounded-2xl border border-white/10"
                                      style={{ backgroundColor: swatch }}
                                    />
                                    {color}
                                  </span>
                                  <span className="text-white/55">
                                    {item.cantidad}
                                  </span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-2xl bg-white/10">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${
                                        ((item.cantidad ?? 0) /
                                          row.max_color_count) *
                                        100
                                      }%`,
                                      backgroundColor: swatch,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PageScaffold>
  );
}
