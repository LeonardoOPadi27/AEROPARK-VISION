import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const clearStoredSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("token_type");
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const tokenType = localStorage.getItem("token_type") || "bearer";

  if (token) {
    config.headers.Authorization = `${tokenType} ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    if (status === 401 && !requestUrl.includes("/auth/login")) {
      clearStoredSession();
      window.dispatchEvent(new Event("session-expired"));
    }

    return Promise.reject(error);
  },
);

export const login = async ({ correo, contrasena }) => {
  const { data } = await api.post("/auth/login", {
    correo,
    contrasena,
  });

  return data;
};

export const uploadImage = async (file, zoneCode) => {
  const formData = new FormData();
  formData.append("file", file);
  if (zoneCode) {
    formData.append("zone_code", zoneCode);
  }

  const { data } = await api.post("/images/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const getImages = async () => {
  const { data } = await api.get("/images");
  return data;
};

export const getLatestImage = async () => {
  const { data } = await api.get("/images/latest");
  return data;
};

export const getAnalyses = async () => {
  const { data } = await api.get("/analysis");
  return data;
};

export const getLatestAnalysis = async () => {
  const { data } = await api.get("/analysis/latest");
  return data;
};

export const getYoloStatus = async () => {
  const { data } = await api.get("/analysis/yolo-status");
  return data;
};

export const getVehicleColorSummary = async () => {
  const { data } = await api.get("/vehicle-colors/summary");
  return data;
};

export const getLatestVehicleColorSummary = async () => {
  const { data } = await api.get("/vehicle-colors/latest");
  return data;
};

export const getLatestParkingSpaces = async () => {
  const { data } = await api.get("/parking-spaces/latest");
  return data;
};

export const getMobileParkingOverview = async () => {
  const { data } = await api.get("/mobile/parking-overview");
  return data;
};

export const getReportsOverview = async () => {
  const { data } = await api.get("/reports/overview");
  return data;
};

export const getSettingsOverview = async () => {
  const { data } = await api.get("/settings/overview");
  return data;
};

export const updateMobileSettings = async (payload) => {
  const { data } = await api.patch("/settings/mobile", payload);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export const runAnalysis = async (imageId) => {
  const { data } = await api.post(`/analysis/images/${imageId}/run`);
  return data;
};

export const runMockAnalysis = async (imageId) => {
  const { data } = await api.post(`/analysis/images/${imageId}/run-mock`);
  return data;
};

export default api;
