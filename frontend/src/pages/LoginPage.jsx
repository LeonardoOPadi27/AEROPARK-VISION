import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "../services/api";
import wallpaperLogin from "../assets/wallpapperlogin.png";
import droneLogin from "../assets/DroneLogin.png";
import aeroParkLogo from "../assets/iconlogin.png";
import userIcon from "../assets/user.png";
import lockIcon from "../assets/lock.png";

export default function LoginPage() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login({ correo, contrasena });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("token_type", data.token_type);
    } catch (err) {
      const status = err.response?.status;
      const message =
        status === 401 || status === 403
          ? "Credenciales incorrectas. Verifica tu correo y contraseña."
          : "No se pudo iniciar sesión. Intenta nuevamente.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-black px-5 py-8 text-white"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.08), rgba(0,0,0,.18)), url(${wallpaperLogin})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_18%,rgba(0, 0, 0, 0.22),transparent_30%),linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.38))]" />

      <div className="relative z-10 w-full max-w-[522px]">
        <img
          src={droneLogin}
          alt=""
          className="pointer-events-none absolute -left-[215px] -top-[123px] z-20 hidden w-[420px] select-none opacity-95 md:block"
        />

      <section className="relative z-10 w-full overflow-hidden rounded-[75px] border border-white/15 bg-black/3 px-8 py-10 backdrop-blur-[3px] sm:px-14 sm:py-14">
        <div className="pointer-events-none absolute inset-0 rounded-[58px] bg-[linear-gradient(115deg,rgba(255,255,255,.32)_0%,rgba(91, 91, 91, 0.08)_16%,rgba(0,0,0,.08)_42%,rgba(255,255,255,.04)_72%,rgba(255,255,255,.18)_100%)]" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/85 to-transparent" />
        <div className="pointer-events-none absolute inset-x-12 bottom-0 h-24 rounded-[999px] bg-white/[.035] blur-2xl" />
        <div className="pointer-events-none absolute -right-10 top-24 h-40 w-32 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <h1 className="sr-only">AeroPark Vision</h1>

          <div className="mb-10 flex justify-center">
            <img
              src={aeroParkLogo}
              alt="AeroPark Vision"
              className="h-auto w-65"
            />
          </div>

          <form onSubmit={handleLogin} className="-mt-2 space-y-10 text-left">
            <div>
              <label
                htmlFor="correo"
                className="mb-4 block text-[20px] font-bold leading-none text-white"
              >
                Usuario
              </label>
              <div className="group relative flex h-[65px] items-center gap-4 overflow-hidden rounded-full border border-white/20 px-8 ,inset_-16px_0_26px_rgba(255,255,255,.18),inset_0_-1px_0_rgba(255,255,255,.2),0_18px_42px_rgba(0,0,0,.62)] backdrop-blur-md transition focus-within:border-white/20 focus-within:shadow-[inset_0_1px_1px_rgba(255,255,255,.58),0_0_8px_rgba(255,255,255,.13)]">
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                <img
                  src={userIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7 select-none object-contain opacity-70 transition group-focus-within:opacity-100"
                />
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-white outline-none placeholder:text-white/48"
                  placeholder="usuario@test.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contrasena"
                className="mb-4 block text-[20px] font-bold leading-none text-white"
              >
                Contraseña
              </label>
              <div className="group relative flex h-[65px] items-center gap-4 overflow-hidden rounded-full border border-white/20 px-8 ,inset_-16px_0_26px_rgba(255,255,255,.18),inset_0_-1px_0_rgba(255,255,255,.2),0_18px_42px_rgba(0,0,0,.62)] backdrop-blur-md transition focus-within:border-white/20 focus-within:shadow-[inset_0_1px_1px_rgba(255,255,255,.58),0_0_8px_rgba(255,255,255,.13)]">
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                <img
                  src={lockIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-7 w-7 select-none object-contain opacity-70 transition group-focus-within:opacity-100"
                />
                <input
                  id="contrasena"
                  type={showPassword ? "text" : "password"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-white outline-none placeholder:text-white/48"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded-full p-1 text-white/90 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-6 w-6" />
                  ) : (
                    <Eye aria-hidden="true" className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative mx-auto mt-12 block h-[60px] w-80 overflow-hidden rounded-full bg-white text-[17px] uppercase tracking-[.1em] text-black shadow-[0_0_4px_rgba(255,255,255,.92),0_0_30px_rgba(255,255,255,.42),0_18px_40px_rgba(0,0,0,.54)] transition duration-300 [font-family:OrbitronLocal,ui-sans-serif] before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-white before:content-[''] after:absolute after:inset-y-0 after:-left-1/2 after:w-1/3 after:skew-x-[-18deg] after:bg-white/80 after:blur-sm after:transition-all after:duration-700 hover:-translate-y-0.5 hover:shadow-[0_0_5px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,.54),0_20px_44px_rgba(0,0,0,.58)] hover:after:left-[120%] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative">
                {loading ? "Validando..." : "Iniciar sesión"}
              </span>
            </button>
          </form>
        </div>
      </section>
      </div>
    </main>
  );
}
