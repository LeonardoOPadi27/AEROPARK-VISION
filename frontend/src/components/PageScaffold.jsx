import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid2X2,
  ImagePlus,
  LogOut,
  Moon,
  ParkingSquare,
  Settings,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import Aurora from "./Aurora";
import SideRays from "./SideRays";
import SplitText from "./SplitText";
import aeroParkLogo from "../assets/logopre-tesis.png";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: Grid2X2 },
  { label: "Cargar imágenes", path: "/upload", icon: ImagePlus },
  { label: "Análisis", path: "/analysis", icon: BarChart3 },
  { label: "Espacios libres", path: "/parking-spaces", icon: ParkingSquare },
  { label: "Colores", path: "/vehicle-colors", icon: SlidersHorizontal },
  { label: "Reportes", path: "/reports", icon: FileText },
  { label: "Configuración", path: "/settings", icon: Settings },
];

const withoutAccents = (text) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function PageScaffold({
  title,
  description,
  module = "analysis",
  children,
  onLogout,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("aeropark-sidebar-collapsed") === "true";
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("aeropark-theme") || "dark";
  });
  const displayTitle = withoutAccents(title);
  const isLight = theme === "light";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("aeropark-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(
      "aeropark-sidebar-collapsed",
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  return (
    <main
      className={`app-liquid-surfaces relative min-h-svh overflow-hidden bg-black text-white ${
        isLight ? "theme-light" : "theme-dark"
      }`}
    >
      <div
        className="relative z-10 grid min-h-svh w-full grid-cols-1 gap-3 p-3 transition-[grid-template-columns] duration-300 sm:gap-4 sm:p-4 lg:h-svh lg:grid-cols-[244px_minmax(0,1fr)] lg:gap-5 lg:p-5"
        style={
          sidebarCollapsed
            ? { gridTemplateColumns: "76px minmax(0,1fr)" }
            : undefined
        }
      >
        <aside
          className={`sidebar-shell relative overflow-visible px-4 py-4 transition-[width,padding] duration-300 lg:h-[calc(100svh-2.5rem)] ${
            sidebarCollapsed ? "lg:px-2" : "lg:pr-3"
          }`}
        >
          {!isLight ? (
            <div className="pointer-events-none absolute -left-24 -top-10 h-[360px] w-[380px] opacity-85 [mask-image:linear-gradient(to_right,black_0%,black_68%,transparent_100%)]">
              <SideRays
                speed={1.25}
                rayColor1="#ffffff"
                rayColor2="#00d9ff"
                intensity={1.45}
                spread={1.8}
                origin="top-left"
                tilt={-8}
                saturation={1.28}
                blend={0.78}
                falloff={1.72}
                opacity={2.98}
              />
            </div>
          ) : null}
          <div
            className={`relative z-10 mb-4 transition-all duration-300 ${
              sidebarCollapsed ? "pl-0" : "pl-5"
            }`}
          >
            <NavLink
              to="/dashboard"
              className={`inline-flex max-w-full items-center ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
              aria-label="AeroPark Vision"
            >
              <img
                src={aeroParkLogo}
                alt="AeroPark Vision"
                className={`led-logo-white w-auto object-contain transition-all duration-300 ${
                  sidebarCollapsed ? "h-11" : "h-16 sm:h-[72px]"
                }`}
              />
            </NavLink>
          </div>

          <nav className="relative z-10 flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-liquid-link group min-w-max lg:min-w-0 ${
                    isActive ? "sidebar-liquid-link-active" : ""
                  }`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="sidebar-liquid-lens" aria-hidden="true" />
                <span
                  className={`sidebar-liquid-content ${
                    sidebarCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed ? item.label : null}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="relative z-10 mt-6 space-y-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className={`sidebar-liquid-link sidebar-collapse-link group hidden lg:flex ${
                sidebarCollapsed
                  ? "sidebar-collapse-icon-only mx-auto w-11"
                  : "w-full"
              }`}
              aria-label={sidebarCollapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
              title={sidebarCollapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
            >
              <span className="sidebar-liquid-lens" aria-hidden="true" />
              <span
                className={`sidebar-liquid-content ${
                  sidebarCollapsed ? "justify-center px-0" : ""
                }`}
              >
                {!sidebarCollapsed ? (
                  <>
                    <ChevronLeft className="h-5 w-5 shrink-0" />
                    <span>Ocultar sidebar</span>
                  </>
                ) : (
                  <ChevronRight className="sidebar-collapse-icon-glow h-6 w-6 shrink-0" />
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className={`flex rounded-2xl px-3 py-2 text-sm font-medium text-white/68 transition hover:bg-white/[.09] hover:text-white ${
                sidebarCollapsed
                  ? "mx-auto w-11 justify-center px-0"
                  : "w-full items-center gap-2"
              }`}
              title={sidebarCollapsed ? "Cerrar sesión" : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed ? "Cerrar sesión" : null}
            </button>
          </div>

        </aside>

        <section className="page-content-shell relative min-w-0 overflow-hidden rounded-[32px] border px-4 py-6 sm:px-6 lg:h-[calc(100svh-2.5rem)] lg:overflow-y-auto lg:px-8">
          <div className="aurora-fixed-color pointer-events-none absolute inset-x-0 top-0 z-0 h-[300px] [mask-image:linear-gradient(to_bottom,black_0%,black_48%,transparent_100%)]">
            <Aurora
              colorStops={
                isLight
                  ? ["#0066ff", "#00ddfb", "#009dff"]
                  : ["#00e1ff", "#1077ec", "#9edbff"]
              }
              blend={isLight ? 0.46 : 0.42}
              amplitude={0.85}
              speed={0.7}
              lightMode={isLight}
            />
          </div>
          <div className="relative z-10 mb-7 flex items-start justify-between gap-5 border-b border-white/10 pb-6">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-white/40">
                AeroPark Vision
              </p>
              <SplitText
                key={displayTitle}
                text={displayTitle}
                tag="h1"
                className="section-title-font led-title-white !overflow-visible text-2xl leading-tight text-white sm:text-3xl"
                delay={32}
                duration={0.9}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 26 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.05}
                rootMargin="-40px"
                textAlign="left"
              />
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52 sm:text-base">
                {description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                className="theme-toggle-button relative inline-grid h-10 w-[76px] grid-cols-2 items-center rounded-full border border-white/12 bg-black/40 p-1 text-white/70 transition"
                aria-label={isLight ? "Activar modo oscuro" : "Activar modo claro"}
                title={isLight ? "Modo light" : "Modo dark"}
              >
                <span
                  aria-hidden="true"
                  className={`theme-toggle-thumb absolute top-1 h-8 w-8 rounded-full transition-transform duration-300 ${
                    isLight ? "translate-x-[36px]" : "translate-x-0"
                  }`}
                />
                <Moon
                  className={`theme-toggle-icon absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${
                    isLight
                      ? "theme-toggle-icon-muted"
                      : "theme-toggle-icon-moon-active"
                  }`}
                />
                <Sun
                  className={`theme-toggle-icon absolute right-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${
                    isLight
                      ? "theme-toggle-icon-sun-active"
                      : "theme-toggle-icon-muted"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="relative z-10">{children}</div>
        </section>
      </div>
    </main>
  );
}
