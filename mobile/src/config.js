import { Platform } from "react-native";

const nativeFallback = "http://192.168.1.50:8000";
const webFallback = "http://localhost:8000";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "web" ? webFallback : nativeFallback);
