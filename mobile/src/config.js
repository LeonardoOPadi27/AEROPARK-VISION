const productionApiUrl = "https://aeropark-api.onrender.com";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  productionApiUrl;
