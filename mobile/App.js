import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import HomeScreen from "./src/screens/HomeScreen";
import SpacesScreen from "./src/screens/SpacesScreen";
import MySpaceScreen from "./src/screens/MySpaceScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import BottomNav from "./src/components/BottomNav";
import { API_BASE_URL } from "./src/config";
import {
  getAnalysisList,
  getMe,
  getParkingOverview,
  login,
  occupySpace,
  registerUser,
  releaseSpace,
  setAuthToken,
} from "./src/services/api";
import { clearSession, loadSession, saveSession } from "./src/services/session";
import {
  prepareNotifications,
  scheduleParkingReminder,
} from "./src/services/notifications";
import { colors } from "./src/theme";
import { buildMobileHistoryItems } from "./src/utils/history";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [zones, setZones] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [activeZoneId, setActiveZoneId] = useState("A");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  const activeZone = zones.find((zone) => zone.id === activeZoneId) ?? zones[0] ?? null;
  const mySpace =
    zones
      .flatMap((zone) =>
        zone.spaces.map((space) => ({
          zone,
          space,
        })),
      )
      .find(
        (entry) =>
          entry.space.status === "user_occupied" &&
          entry.space.reported_user_id === sessionUser?.id_usuario,
      ) ?? null;

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const [overview, analysisItems] = await Promise.all([
        getParkingOverview(),
        getAnalysisList(),
      ]);
      setZones(overview.zones ?? []);
      setActiveZoneId((currentZoneId) =>
        overview.zones?.some((zone) => zone.id === currentZoneId)
          ? currentZoneId
          : (overview.zones?.[0]?.id ?? "A"),
      );
      setHistoryItems(buildMobileHistoryItems(analysisItems));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await prepareNotifications();
      const session = await loadSession();
      if (!session.token) {
        setAuthReady(true);
        setLoading(false);
        return;
      }

      try {
        setAuthToken(session.token);
        const user = await getMe();
        setSessionUser(user);
        await loadOverview();
      } catch {
        await clearSession();
        setAuthToken(null);
      } finally {
        setAuthReady(true);
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const handleLogin = async ({ correo, contrasena }) => {
    try {
      setSubmittingLogin(true);
      setAuthError(null);
      const result = await login(correo, contrasena);
      setAuthToken(result.access_token);
      await saveSession(result.access_token, result.user);
      setSessionUser(result.user);
      await prepareNotifications();
      await loadOverview();
    } catch {
      setAuthError("No se pudo iniciar sesión con esas credenciales.");
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleRegister = async ({ nombres, apellidos, correo, contrasena }) => {
    try {
      setSubmittingLogin(true);
      setAuthError(null);
      await registerUser({ nombres, apellidos, correo, contrasena });
      const result = await login(correo, contrasena);
      setAuthToken(result.access_token);
      await saveSession(result.access_token, result.user);
      setSessionUser(result.user);
      await prepareNotifications();
      await loadOverview();
    } catch (registerError) {
      setAuthError(registerError.message || "No se pudo crear la cuenta.");
    } finally {
      setSubmittingLogin(false);
    }
  };

  const handleOccupySpace = async (spaceCode, durationHours) => {
    await occupySpace(spaceCode, durationHours);
    await scheduleParkingReminder(spaceCode, durationHours);
    await loadOverview();
  };

  const handleReleaseSpace = async (spaceCode) => {
    await releaseSpace(spaceCode);
    await loadOverview();
  };

  const handleLogout = async () => {
    await clearSession();
    setAuthToken(null);
    setSessionUser(null);
    setZones([]);
    setAuthReady(true);
    setActiveTab("home");
  };

  const sharedScreenProps = {
    zones,
    activeZoneId,
    setActiveZoneId,
    activeZone,
    currentUserId: sessionUser?.id_usuario,
    onOccupySpace: handleOccupySpace,
    onReleaseSpace: handleReleaseSpace,
  };

  if (!authReady || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ExpoStatusBar style="light" />
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.text} size="large" />
          <Text style={styles.stateText}>Cargando disponibilidad real...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ExpoStatusBar style="light" />
        <LoginScreen
          onSubmit={handleLogin}
          onRegister={handleRegister}
          submitting={submittingLogin}
          error={authError}
        />
      </SafeAreaView>
    );
  }

  if (error && !zones.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ExpoStatusBar style="light" />
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>No se pudo conectar la app mobile</Text>
          <Text style={styles.stateText}>
            Revisa la API en {API_BASE_URL} o define EXPO_PUBLIC_API_URL.
          </Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <View style={styles.appFrame}>
        {activeTab === "home" ? (
          <HomeScreen {...sharedScreenProps} setActiveTab={setActiveTab} />
        ) : null}
        {activeTab === "spaces" ? <SpacesScreen {...sharedScreenProps} /> : null}
        {activeTab === "my-space" ? (
          <MySpaceScreen
            user={sessionUser}
            mySpace={mySpace}
            onReleaseSpace={handleReleaseSpace}
            onOpenSpaces={() => setActiveTab("spaces")}
          />
        ) : null}
        {activeTab === "profile" ? (
          <ProfileScreen
            apiBaseUrl={API_BASE_URL}
            onRefresh={loadOverview}
            refreshing={loading}
            user={sessionUser}
            onLogout={handleLogout}
            historyItems={historyItems}
          />
        ) : null}

        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appFrame: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: colors.background,
    gap: 12,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    color: colors.occupied,
    fontSize: 13,
    textAlign: "center",
  },
});
