import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Eye, EyeOff, Save, Trash2, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { API_BASE_URL, getImages, getSpaceCalibration, saveSpaceCalibration } from "../services/api";

const imageUrl = (path) => path?.startsWith("http") ? path : `${API_BASE_URL}${path}`;
const failure = (error) => typeof error.response?.data?.detail === "string"
  ? error.response.data.detail : "No se pudo completar la operacion.";

function Tool({ label, children, ...props }) {
  return <button type="button" title={label} aria-label={label}
    className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/20 hover:bg-white/10 disabled:opacity-30" {...props}>{children}</button>;
}

export default function SpaceCalibrationEditor({ zone, onClose, onSaved, renderMap }) {
  const [images, setImages] = useState([]);
  const [imageId, setImageId] = useState(zone.image_id || "");
  const [referenceId, setReferenceId] = useState("");
  const [editor, setEditor] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [selected, setSelected] = useState(`${zone.id}-001`);
  const [draft, setDraft] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [showDetections, setShowDetections] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const dialogRef = useRef(null);
  const svgRef = useRef(null);
  const codes = zone.spaces.map((space) => space.code);

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    let active = true;
    getImages().then((rows) => {
      if (!active) return;
      setImages(rows);
      setImageId((current) => current || rows.find((row) => row.zone_code === zone.id)?.id_imagen || rows[0]?.id_imagen || "");
    }).catch((err) => active && setError(failure(err)));
    return () => { active = false; document.body.style.overflow = overflow; previous?.focus(); };
  }, [zone.id]);

  useEffect(() => {
    if (!imageId) return;
    let active = true;
    getSpaceCalibration(imageId).then((data) => {
      if (!active) return;
      setEditor(data);
      setSpaces(data.calibration?.zone_code === zone.id ? data.calibration.spaces : []);
      setDraft([]);
      setDirty(false);
      setError("");
    }).catch((err) => { if (active) { setError(failure(err)); setEditor(null); } });
    return () => { active = false; };
  }, [imageId, zone.id]);

  const selectSpace = (code) => {
    setSelected(code);
    setDraft([]);
  };
  const saveDraft = () => {
    if (draft.length !== 4) return;
    setSpaces((current) => [...current.filter((space) => space.code !== selected), { code: selected, polygon: draft }]);
    setDraft([]);
    setDirty(true);
    setSelected(codes[Math.min(codes.indexOf(selected) + 1, codes.length - 1)]);
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await saveSpaceCalibration(editor.image_id, {
        zone_code: zone.id, image_width: editor.image_width, image_height: editor.image_height, spaces,
      });
      await onSaved();
      setDirty(false);
      onClose();
    } catch (err) { setError(failure(err)); }
    finally { setBusy(false); }
  };
  const copyReference = async () => {
    setBusy(true);
    try {
      const data = await getSpaceCalibration(referenceId);
      if (data.calibration?.zone_code !== zone.id) throw new Error("La referencia no tiene calibracion de esta zona.");
      setSpaces(data.calibration.spaces);
      setDraft([]);
      setDirty(true);
      setError("");
    } catch (err) { setError(err.response ? failure(err) : err.message); }
    finally { setBusy(false); }
  };
  const close = () => {
    if (!busy && (!dirty && !draft.length || window.confirm("Hay cambios sin guardar. ¿Cerrar la calibracion?"))) onClose();
  };
  const handleKey = (event) => {
    if (event.key === "Escape") { event.stopPropagation(); close(); }
    if (event.key !== "Tab") return;
    const focusable = [...dialogRef.current.querySelectorAll("button:not(:disabled), select:not(:disabled), input, [tabindex='0']")];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1100] bg-black/85 p-2 sm:p-4">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="calibration-title" tabIndex={-1} onKeyDown={handleKey}
        className="mx-auto flex h-full max-w-[1600px] flex-col overflow-hidden rounded-lg border border-white/20 bg-[#141414] text-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
          <div><h2 id="calibration-title" className="text-lg font-semibold">Calibracion de zona {zone.id}</h2><p className="text-xs text-white/60">{spaces.length}/{codes.length} espacios vinculados{dirty ? " · Cambios sin guardar" : ""}</p></div>
          <div className="flex gap-2">
            <button disabled={busy || !editor || editor.image_id !== Number(imageId) || draft.length > 0} onClick={save} className="flex items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40"><Save size={16} />{busy ? "Guardando..." : "Guardar"}</button>
            <Tool label="Cerrar calibracion" onClick={close} disabled={busy}><X size={18} /></Tool>
          </div>
        </header>
        {error && <p role="alert" className="shrink-0 border-b border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200">{error}</p>}
        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-auto md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-1">
          <aside className="space-y-4 overflow-auto border-b border-white/15 p-4 md:border-b-0 md:border-r">
            <label className="block text-sm">Foto de referencia
              <select aria-label="Foto de referencia" value={imageId} disabled={busy} onChange={(event) => {
                if ((dirty || draft.length) && !window.confirm("¿Cambiar la foto y descartar los cambios sin guardar?")) return;
                setEditor(null); setImageId(event.target.value);
              }} className="mt-1 w-full min-w-0 rounded-md border border-white/20 bg-[#202020] p-2 text-xs">
                <option value="" disabled>Seleccionar imagen</option>
                {images.map((row) => <option key={row.id_imagen} value={row.id_imagen}>#{row.id_imagen} · {row.original_filename || "Imagen"}</option>)}
              </select>
            </label>
            <p className="text-xs text-white/65">Zona asignada al guardar: {zone.id}{editor?.zone_code && editor.zone_code !== zone.id ? ` (actual: ${editor.zone_code})` : ""}</p>
            <label className="block text-sm">Espacio
              <select aria-label="Espacio" value={selected} onChange={(event) => selectSpace(event.target.value)} className="mt-1 w-full rounded-md border border-white/20 bg-[#202020] p-2">
                {codes.map((code) => <option key={code}>{code}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Tool label="Confirmar cuatro esquinas" onClick={saveDraft} disabled={draft.length !== 4}><Check size={18} /></Tool>
              <Tool label="Deshacer esquina" onClick={() => setDraft(draft.slice(0, -1))} disabled={!draft.length}><Undo2 size={18} /></Tool>
              <Tool label="Quitar poligono seleccionado" onClick={() => { setSpaces(spaces.filter((s) => s.code !== selected)); setDraft([]); setDirty(true); }} disabled={!spaces.some((s) => s.code === selected)}><Trash2 size={18} /></Tool>
              <span className="text-xs text-white/65">{draft.length}/4 esquinas</span>
            </div>
            <details><summary className="cursor-pointer text-sm">Referencia del plano</summary><div className="mt-2 overflow-auto">{renderMap?.(selected, selectSpace)}</div></details>
            <details><summary className="cursor-pointer text-sm">Reutilizar calibracion</summary>
              <select aria-label="Calibracion de referencia" value={referenceId} onChange={(event) => setReferenceId(event.target.value)} className="my-2 w-full rounded-md border border-white/20 bg-[#202020] p-2 text-xs">
                <option value="">Seleccionar referencia</option>
                {images.filter((row) => row.id_imagen !== Number(imageId)).map((row) => <option key={row.id_imagen} value={row.id_imagen}>#{row.id_imagen} · {row.original_filename || "Imagen"}</option>)}
              </select>
              <button disabled={!referenceId || busy} onClick={copyReference} className="flex items-center gap-2 text-sm disabled:opacity-40"><Copy size={16} />Cargar como borrador</button>
            </details>
          </aside>
          <div className="flex min-h-[420px] min-w-0 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-white/15 px-3 py-2">
              <Tool label="Reducir zoom" onClick={() => setZoom(Math.max(1, zoom - 0.5))}><ZoomOut size={18} /></Tool>
              <span className="w-12 text-center text-xs">{zoom * 100}%</span>
              <Tool label="Ampliar zoom" onClick={() => setZoom(Math.min(4, zoom + 0.5))}><ZoomIn size={18} /></Tool>
              <Tool label={showDetections ? "Ocultar detecciones" : "Mostrar detecciones"} onClick={() => setShowDetections(!showDetections)}>{showDetections ? <Eye size={18} /> : <EyeOff size={18} />}</Tool>
              <span className="text-xs text-white/65">{selected}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-black/30 p-3">
              {editor && editor.image_id === Number(imageId) ? <svg ref={svgRef} role="img" aria-label="Imagen de calibracion" viewBox={`0 0 ${editor.image_width} ${editor.image_height}`} style={{ width: `${zoom * 100}%`, maxWidth: "none", display: "block", cursor: "crosshair" }}
                onClick={(event) => {
                  if (draft.length === 4) return;
                  const rect = svgRef.current.getBoundingClientRect();
                  setDraft([...draft, [Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))]]);
                }}>
                <image href={imageUrl(editor.image_url)} width={editor.image_width} height={editor.image_height} />
                {showDetections && editor.detections.map((d, index) => <rect key={index} x={d.bbox[0]} y={d.bbox[1]} width={d.bbox[2] - d.bbox[0]} height={d.bbox[3] - d.bbox[1]} fill="none" stroke="#38bdf8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
                {spaces.map((space) => <g key={space.code}>
                  <polygon points={space.polygon.map(([x, y]) => `${x * editor.image_width},${y * editor.image_height}`).join(" ")} fill={space.code === selected ? "#fbbf2460" : "#34d39930"} stroke={space.code === selected ? "#fbbf24" : "#34d399"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <text x={space.polygon[0][0] * editor.image_width} y={space.polygon[0][1] * editor.image_height} fill="white" stroke="black" paintOrder="stroke" strokeWidth={editor.image_width / 1100} fontSize={editor.image_width / 90}>{space.code}</text>
                </g>)}
                <polygon points={draft.map(([x, y]) => `${x * editor.image_width},${y * editor.image_height}`).join(" ")} fill="#fbbf2440" stroke="#fbbf24" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                {draft.map(([x, y], index) => <circle key={index} cx={x * editor.image_width} cy={y * editor.image_height} r={editor.image_width / 220} fill="#fbbf24" />)}
              </svg> : <p role="status" className="p-6 text-sm text-white/60">{imageId ? "Cargando imagen..." : "Sin imagenes disponibles"}</p>}
            </div>
          </div>
        </div>
      </section>
    </div>, document.body,
  );
}
