import { useEffect, useState } from "react";
import AppRouter from "./routes/AppRouter";
import { getCurrentUser } from "./services/api";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(
    () => !localStorage.getItem("token"),
  );

  useEffect(() => {
    let active = true;
    if (localStorage.getItem("token")) {
      getCurrentUser()
        .then((user) => {
          if (active && user.is_admin) setIsAuthenticated(true);
          if (!user.is_admin) {
            localStorage.removeItem("token");
            localStorage.removeItem("token_type");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("token_type");
        })
        .finally(() => { if (active) setSessionChecked(true); });
    }
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener("session-expired", handleSessionExpired);

    return () => {
      active = false;
      window.removeEventListener("session-expired", handleSessionExpired);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    setIsAuthenticated(false);
  };

  if (!sessionChecked) return null;

  return (
    <AppRouter
      isAuthenticated={isAuthenticated}
      onLoginSuccess={() => setIsAuthenticated(true)}
      onLogout={handleLogout}
    />
  );
}

export default App;
