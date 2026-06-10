import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import AnalysisPage from "../pages/AnalysisPage";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import ParkingSpacesPage from "../pages/ParkingSpacesPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import UploadImagesPage from "../pages/UploadImagesPage";
import VehicleColorsPage from "../pages/VehicleColorsPage";

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function LoginRoute({ isAuthenticated, onLoginSuccess }) {
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <LoginPage
      onLoginSuccess={() => {
        onLoginSuccess();
        navigate("/dashboard", { replace: true });
      }}
    />
  );
}

export default function AppRouter({
  isAuthenticated,
  onLoginSuccess,
  onLogout,
}) {
  const protectedElement = (element) => (
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      {element}
    </ProtectedRoute>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginRoute
              isAuthenticated={isAuthenticated}
              onLoginSuccess={onLoginSuccess}
            />
          }
        />
        <Route
          path="/dashboard"
          element={protectedElement(<DashboardPage onLogout={onLogout} />)}
        />
        <Route
          path="/upload"
          element={protectedElement(<UploadImagesPage onLogout={onLogout} />)}
        />
        <Route
          path="/analysis"
          element={protectedElement(<AnalysisPage onLogout={onLogout} />)}
        />
        <Route
          path="/parking-spaces"
          element={protectedElement(<ParkingSpacesPage onLogout={onLogout} />)}
        />
        <Route
          path="/vehicle-colors"
          element={protectedElement(<VehicleColorsPage onLogout={onLogout} />)}
        />
        <Route
          path="/reports"
          element={protectedElement(<ReportsPage onLogout={onLogout} />)}
        />
        <Route
          path="/settings"
          element={protectedElement(<SettingsPage onLogout={onLogout} />)}
        />
        <Route
          path="/"
          element={
            <Navigate
              to={isAuthenticated ? "/dashboard" : "/login"}
              replace
            />
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={isAuthenticated ? "/dashboard" : "/login"}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
