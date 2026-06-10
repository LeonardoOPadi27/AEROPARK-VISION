import { useEffect, useState } from "react";
import AppRouter from "./routes/AppRouter";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener("session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("session-expired", handleSessionExpired);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_type");
    setIsAuthenticated(false);
  };

  return (
    <AppRouter
      isAuthenticated={isAuthenticated}
      onLoginSuccess={() => setIsAuthenticated(true)}
      onLogout={handleLogout}
    />
  );
}

export default App;
