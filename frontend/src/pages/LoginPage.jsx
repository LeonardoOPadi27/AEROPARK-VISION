import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import { login } from "../services/api";
import loginWallpaper from "../assets/wallpaper-7.png";
import aeroParkLogo from "../assets/logopre-tesis.png";
import userIcon from "../assets/user.png";
import lockIcon from "../assets/lock.png";

const loginBlockVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: "easeOut" },
  },
};

export default function LoginPage({ onLoginSuccess }) {
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
      onLoginSuccess?.();
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
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-black px-5 py-8 text-white">
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${loginWallpaper})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
        }}
        initial={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
        animate={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 z-30 bg-black"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 0.72, 0] }}
        transition={{ duration: 2, times: [0, 0.58, 1], ease: "easeOut" }}
      />

      <motion.div
        className="relative z-10 w-full max-w-[420px] px-2 sm:px-0"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="sr-only">AeroPark Vision</h1>

          <motion.div
            className="mb-10 flex justify-center"
            initial={{ opacity: 0, y: 175, scale: 1.18 }}
            animate={{
              opacity: [0, 1, 1],
              y: [175, 175, 0],
              scale: [1.18, 1.18, 1],
            }}
            transition={{
              duration: 3.05,
              times: [0, 0.58, 1],
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <motion.img
              src={aeroParkLogo}
              alt="AeroPark Vision"
              className="h-auto w-65 drop-shadow-[0_0_18px_rgba(255,255,255,.42)]"
              animate={{
                filter: [
                  "drop-shadow(0 0 10px rgba(255,255,255,.28))",
                  "drop-shadow(0 0 24px rgba(255,255,255,.5))",
                  "drop-shadow(0 0 18px rgba(255,255,255,.42))",
                ],
              }}
              transition={{
                duration: 3.05,
                times: [0, 0.58, 1],
                ease: "easeInOut",
              }}
            />
          </motion.div>

          <motion.form
            onSubmit={handleLogin}
            className="-translate-y-5 space-y-8 text-left"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  delayChildren: 2.75,
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            <motion.div variants={loginBlockVariants}>
              <label
                htmlFor="correo"
                className="mb-3 block text-[18px] font-bold leading-none text-white"
              >
                Usuario
              </label>
              <div className="group relative flex h-[58px] items-center gap-3.5 overflow-hidden rounded-full border border-white/20 px-7 ,inset_-16px_0_26px_rgba(255,255,255,.18),inset_0_-1px_0_rgba(255,255,255,.2),0_18px_42px_rgba(0,0,0,.62)] backdrop-blur-md transition focus-within:border-white/20 focus-within:shadow-[inset_0_1px_1px_rgba(255,255,255,.58),0_0_8px_rgba(255,255,255,.13)]">
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                <img
                  src={userIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-6 w-6 select-none object-contain opacity-70 transition group-focus-within:opacity-100"
                />
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-white outline-none placeholder:text-white/48"
                  placeholder="usuario@test.com"
                  autoComplete="email"
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={loginBlockVariants}>
              <label
                htmlFor="contrasena"
                className="mb-3 block text-[18px] font-bold leading-none text-white"
              >
                Contraseña
              </label>
              <div className="group relative flex h-[58px] items-center gap-3.5 overflow-hidden rounded-full border border-white/20 px-7 ,inset_-16px_0_26px_rgba(255,255,255,.18),inset_0_-1px_0_rgba(255,255,255,.2),0_18px_42px_rgba(0,0,0,.62)] backdrop-blur-md transition focus-within:border-white/20 focus-within:shadow-[inset_0_1px_1px_rgba(255,255,255,.58),0_0_8px_rgba(255,255,255,.13)]">
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                <img
                  src={lockIcon}
                  alt=""
                  aria-hidden="true"
                  className="h-6 w-6 select-none object-contain opacity-70 transition group-focus-within:opacity-100"
                />
                <input
                  id="contrasena"
                  type={showPassword ? "text" : "password"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-white outline-none placeholder:text-white/48"
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
                    <EyeOff aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <Eye aria-hidden="true" className="h-5 w-5" />
                  )}
                </button>
              </div>
            </motion.div>

            {error && (
              <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-100">
                {error}
              </p>
            )}

            <motion.div variants={loginBlockVariants}>
              <button
                type="submit"
                disabled={loading}
                className="relative mx-auto mt-10 block h-[54px] w-72 overflow-hidden rounded-full bg-white text-[15px] uppercase tracking-[.1em] text-black shadow-[0_0_4px_rgba(255,255,255,.92),0_0_30px_rgba(255,255,255,.42),0_18px_40px_rgba(0,0,0,.54)] transition duration-300 [font-family:OrbitronLocal,ui-sans-serif] before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-white before:content-[''] after:absolute after:inset-y-0 after:-left-1/2 after:w-1/3 after:skew-x-[-18deg] after:bg-white/80 after:blur-sm after:transition-all after:duration-700 hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-[0_0_5px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,.54),0_20px_44px_rgba(0,0,0,.58)] hover:after:left-[120%] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="relative">
                  {loading ? "Validando..." : "Iniciar sesión"}
                </span>
              </button>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>
    </main>
  );
}
