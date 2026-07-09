import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import PageScaffold from "../components/PageScaffold";
import { getSettingsOverview, updateMobileSettings } from "../services/api";

const toFormState = (mobile) => ({
  manual_occupy_enabled: Boolean(mobile?.manual_occupy_enabled),
  manual_release_enabled: Boolean(mobile?.manual_release_enabled),
  reminders_enabled: Boolean(mobile?.reminders_enabled),
  max_estimated_hours: String(mobile?.max_estimated_hours ?? 12),
  pending_confirmation_after_hours: String(
    mobile?.pending_confirmation_after_hours ?? 2,
  ),
  default_zone: mobile?.default_zone ?? "A",
});

export default function SettingsPage({ onLogout }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(() => toFormState(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      setError("");
      try {
        const settingsPayload = await getSettingsOverview();

        if (!mounted) return;

        setSettings(settingsPayload);
        setForm(toFormState(settingsPayload.mobile));
      } catch {
        if (mounted) {
          setError("No se pudo cargar la configuración real del sistema.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    if (!settings?.mobile) return false;
    const current = toFormState(settings.mobile);
    return JSON.stringify(current) !== JSON.stringify(form);
  }, [form, settings?.mobile]);

  const handleToggle = (key) => {
    setForm((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setNotice("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setNotice("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        manual_occupy_enabled: form.manual_occupy_enabled,
        manual_release_enabled: form.manual_release_enabled,
        reminders_enabled: form.reminders_enabled,
        max_estimated_hours: Number(form.max_estimated_hours),
        pending_confirmation_after_hours: Number(
          form.pending_confirmation_after_hours,
        ),
        default_zone: form.default_zone,
      };

      const saved = await updateMobileSettings(payload);
      setSettings((current) => ({
        ...current,
        mobile: saved,
      }));
      setForm(toFormState(saved));
      setNotice("Preferencias mobile guardadas correctamente.");
    } catch {
      setError("No se pudieron guardar los ajustes mobile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageScaffold
      title="Configuracion"
      description="Ajustes que definen como funciona la experiencia mobile para ocupar, liberar y confirmar espacios."
      module="settings"
      onLogout={onLogout}
    >
      {isLoading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[26px] border border-white/10 bg-[#0a0a0a] text-white/60">
          <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
          Cargando configuracion...
        </div>
      ) : error && !settings ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {notice}
            </div>
          ) : null}

          <section className="rounded-[26px] border border-white/10 bg-[#0a0a0a] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SectionHeader
                eyebrow="Mobile"
                title="Preferencias de la app"
                description="Configura lo minimo importante para que el usuario entre, marque su espacio y no olvide confirmarlo o liberarlo."
                icon={Smartphone}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white px-5 text-sm font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar cambios
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-3">
                <ToggleCard
                  title="Ocupacion manual"
                  description="Permite que el usuario marque que ya esta usando un espacio."
                  checked={form.manual_occupy_enabled}
                  onChange={() => handleToggle("manual_occupy_enabled")}
                />
                <ToggleCard
                  title="Liberacion manual"
                  description="Permite que el usuario deje libre su espacio al retirarse."
                  checked={form.manual_release_enabled}
                  onChange={() => handleToggle("manual_release_enabled")}
                />
                <ToggleCard
                  title="Recordatorios"
                  description="Activa avisos para confirmar si el espacio sigue ocupado."
                  checked={form.reminders_enabled}
                  onChange={() => handleToggle("reminders_enabled")}
                  icon={BellRing}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormCard
                  label="Horas maximas estimadas"
                  name="max_estimated_hours"
                  type="number"
                  value={form.max_estimated_hours}
                  min={1}
                  max={24}
                  onChange={handleInputChange}
                  hint="Tope permitido para lo que el usuario puede indicar al estacionarse."
                />
                <FormCard
                  label="Reconfirmar despues de"
                  name="pending_confirmation_after_hours"
                  type="number"
                  value={form.pending_confirmation_after_hours}
                  min={1}
                  max={12}
                  onChange={handleInputChange}
                  hint="Horas de espera antes de solicitar confirmacion al usuario."
                />
                <div className="rounded-[22px] border border-white/10 bg-white/[.03] p-3.5 md:col-span-2">
                  <label
                    htmlFor="default_zone"
                    className="text-xs font-black uppercase tracking-[.18em] text-white/45"
                  >
                    Zona por defecto
                  </label>
                  <select
                    id="default_zone"
                    name="default_zone"
                    value={form.default_zone}
                    onChange={handleInputChange}
                    className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/50 px-4 text-sm font-semibold text-white outline-none transition focus:border-white/30"
                  >
                    <option value="A">Estacionamiento A</option>
                    <option value="B">Estacionamiento B</option>
                  </select>
                  <p className="mt-2 text-sm leading-6 text-white/52">
                    Se puede usar como punto inicial en la experiencia mobile.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </PageScaffold>
  );
}

function SectionHeader({ eyebrow, title, description, icon: Icon }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[.18em] text-white/45">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">{description}</p>
      </div>
      {Icon ? (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white/70">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  icon: Icon = ShieldCheck,
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[.03] p-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-white/70" />
            <h3 className="text-sm font-black text-white">{title}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/52">{description}</p>
        </div>
        <button
          type="button"
          onClick={onChange}
          className={`relative h-8 w-14 shrink-0 rounded-full border transition ${
            checked
              ? "border-white/30 bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.16)]"
              : "border-white/12 bg-white/[.06]"
          }`}
          aria-pressed={checked}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-black transition-all ${
              checked ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function FormCard({ label, hint, ...props }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[.03] p-3.5">
      <label className="text-xs font-black uppercase tracking-[.18em] text-white/45">
        {label}
      </label>
      <input
        {...props}
        className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/50 px-4 text-sm font-semibold text-white outline-none transition focus:border-white/30"
      />
      <p className="mt-2 text-sm leading-6 text-white/52">{hint}</p>
    </div>
  );
}
