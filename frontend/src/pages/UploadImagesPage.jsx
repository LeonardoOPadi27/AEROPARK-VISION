import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileImage,
  ImagePlus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import DottedSurface from "../components/ui/DottedSurface";
import { API_BASE_URL, getLatestImage, uploadImage } from "../services/api";

const parkingZones = [
  { code: "A", label: "Zona A" },
  { code: "B", label: "Zona B" },
  { code: "C", label: "Zona C" },
];

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(2)} MB`;
};

const getStoredImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
};

export default function UploadImagesPage({ onLogout }) {
  const inputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState("Esperando imagen");
  const [uploadResult, setUploadResult] = useState(null);
  const [latestImage, setLatestImage] = useState(null);
  const [selectedZoneCode, setSelectedZoneCode] = useState("A");

  const previewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  const activeImage = uploadResult ?? latestImage;
  const storedImageUrl = getStoredImageUrl(activeImage?.url);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    let isMounted = true;

    const loadLatestImage = async () => {
      try {
        const data = await getLatestImage();
        if (!isMounted) return;
        setLatestImage(data);
        setStatus("Última imagen cargada disponible");
      } catch {
        if (!isMounted) return;
      }
    };

    loadLatestImage();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Selecciona un archivo de imagen válido");
      setUploadResult(null);
      return;
    }

    setImageFile(file);
    setUploadResult(null);
    setStatus("Imagen lista para subir");
  };

  const handleInputChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!imageFile) {
      setStatus("Selecciona una imagen antes de subir");
      return;
    }

    if (uploadResult) return;

    setIsUploading(true);
    setStatus("Subiendo imagen...");

    try {
      const result = await uploadImage(imageFile, selectedZoneCode);
      setUploadResult(result);
      setLatestImage(result);
      setStatus("Imagen subida correctamente");
    } catch {
      setStatus("No se pudo subir la imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setUploadResult(null);
    setLatestImage(null);
    setStatus("Esperando imagen");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <PageScaffold
      title="Carga de imágenes"
      description="Selecciona una imagen aérea capturada por dron para preparar su análisis. Esta vista ya puede enviar archivos al endpoint POST /images/upload."
      module="upload"
      onLogout={onLogout}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <section
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative grid min-h-[340px] place-items-center overflow-hidden rounded-3xl border border-dashed p-7 text-center transition ${
            isDragging
              ? "border-white/45 rounded-3xl border border-white/10 bg-[#0a0a0a]"
              : "border-white/20 rounded-3xl border border-white/10 bg-[#0a0a0a]"
          }`}
        >
          <DottedSurface className="z-0 opacity-40" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.04),transparent_62%)]" />

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />

          <div className="relative z-10">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[.03] text-white/70">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-semibold tracking-[-.02em]">
              Arrastra una imagen aérea
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/55">
              Usa imágenes JPG, PNG o WEBP del estacionamiento. La imagen se
              previsualiza localmente antes de enviarse al backend.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {parkingZones.map((zone) => (
                <button
                  key={zone.code}
                  type="button"
                  onClick={() => setSelectedZoneCode(zone.code)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    selectedZoneCode === zone.code
                      ? "border-white bg-white text-black"
                      : "border-white/12 bg-white/[.04] text-white/65 hover:text-white"
                  }`}
                >
                  {zone.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="liquid-action-button liquid-action-button-light mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            >
              <ImagePlus className="h-5 w-5" />
              Seleccionar imagen
            </button>
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
                Vista previa
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-.02em]">Última imagen</h2>
            </div>
            <span className="rounded-2xl border border-white/10 bg-white/[.03] px-3 py-1 text-xs font-medium text-white/60">
              {activeImage ? "Subida" : "Local"}
            </span>
          </div>

          <div className="relative grid aspect-video place-items-center overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] bg-black/50">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa de imagen aérea"
                className="h-full w-full object-cover"
              />
            ) : storedImageUrl ? (
              <img
                src={storedImageUrl}
                alt="Última imagen cargada"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-center text-white/45">
                <FileImage className="mx-auto mb-3 h-12 w-12" />
                <p className="font-bold">Sin imagen seleccionada</p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3 rounded-2xl bg-white/[.03] p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-white/45" />
              <span className="text-sm font-medium text-white/75">{status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/[.03] p-3">
                <p className="text-white/40">Archivo</p>
                <p className="truncate font-bold">
                  {imageFile?.name ?? activeImage?.original_filename ?? "Pendiente"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[.03] p-3">
                <p className="text-white/40">Zona</p>
                <p className="font-bold">
                  {parkingZones.find((zone) => zone.code === selectedZoneCode)?.label ??
                    activeImage?.zone_title ??
                    "Pendiente"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[.03] p-3">
                <p className="text-white/40">Tamaño</p>
                <p className="font-bold">{formatFileSize(imageFile?.size)}</p>
              </div>
            </div>
            {activeImage && (
              <div className="rounded-2xl bg-white/[.03] p-3 text-sm">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-white/45">
                    URL guardada · ID {activeImage.id_imagen}
                  </p>
                  <a
                    href={storedImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-black text-white/75 transition hover:text-white"
                  >
                    Ver archivo
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="truncate font-bold text-white/75">
                  {activeImage.url}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!imageFile || isUploading || Boolean(uploadResult)}
              className="liquid-action-button liquid-action-button-light inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
            >
              <UploadCloud className="h-4 w-4" />
              {isUploading
                ? "Subiendo..."
                : uploadResult
                  ? "Imagen subida"
                  : "Subir imagen"}
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="liquid-action-button inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Cambiar
            </button>
          </div>

          <button
            type="button"
            onClick={clearImage}
            disabled={!imageFile && !activeImage}
            className="liquid-action-button mt-3 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
          >
            <Trash2 className="h-4 w-4" />
            Quitar imagen
          </button>
        </aside>
      </div>
    </PageScaffold>
  );
}
