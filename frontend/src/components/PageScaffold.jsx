import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  Grid2X2,
  ImagePlus,
  LogOut,
  ParkingSquare,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import Aurora from "./Aurora";
import Lightning from "./Lightning";
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

const iconMap = {
  dashboard: Grid2X2,
  upload: ImagePlus,
  analysis: BarChart3,
  parking: ParkingSquare,
  colors: SlidersHorizontal,
  reports: FileText,
  settings: Settings,
};

const withoutAccents = (text) =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function PageScaffold({
  title,
  description,
  module = "analysis",
  children,
  onLogout,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const Icon = iconMap[module] ?? BarChart3;
  const displayTitle = withoutAccents(title);

  return (
    <main className="app-liquid-surfaces relative min-h-svh overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]">
        <Aurora
          colorStops={["#00e1ff", "#0b75ee", "#9edbff"]}
          blend={0.42}
          amplitude={0.85}
          speed={0.7}
        />
      </div>
      <div
        className="relative z-10 mx-auto grid min-h-svh max-w-[1560px] grid-cols-1 transition-[grid-template-columns] duration-300 lg:h-svh lg:grid-cols-[244px_minmax(0,1fr)]"
        style={
          sidebarCollapsed
            ? { gridTemplateColumns: "76px minmax(0,1fr)" }
            : undefined
        }
      >
        <aside
          className={`relative overflow-visible border-b border-white/10 bg-[#050505]/95 px-4 py-4 transition-[width,padding] duration-300 lg:h-svh lg:border-b-0 lg:border-r ${
            sidebarCollapsed ? "lg:px-2" : "lg:pr-3"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-35 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
            <Lightning
              hue={215}
              xOffset={-0.15}
              speed={0.85}
              intensity={0.7}
              size={0.9}
            />
          </div>
          <div
            className={`relative z-10 mb-6 transition-all duration-300 ${
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

          <div className="relative z-10 mt-6">
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

          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="sidebar-toggle-button absolute -right-4 top-1/2 z-40 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/12 bg-black text-white/80 transition hover:text-white lg:grid"
            aria-label={sidebarCollapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
            title={sidebarCollapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-6 lg:h-svh lg:overflow-y-auto lg:px-8">
          <div className="mb-7 flex items-start justify-between gap-5 border-b border-white/10 pb-6">
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
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-white/70">
              <Icon className="h-5 w-5" />
            </div>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
