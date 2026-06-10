import { API_BASE_URL } from "../config";

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Error ${response.status}`;

    try {
      const payload = JSON.parse(text);
      if (Array.isArray(payload.detail)) {
        message = payload.detail[0]?.msg || message;
      } else {
        message = payload.detail || message;
      }
    } catch {
      // Keep the original response text when it is not JSON.
    }

    throw new Error(message);
  }

  return response.json();
}

export function login(correo, contrasena) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ correo, contrasena }),
  });
}

export function registerUser({ nombres, apellidos, correo, contrasena }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nombres, apellidos, correo, contrasena }),
  });
}

export function getMe() {
  return request("/auth/me");
}

export function getParkingOverview() {
  return request("/mobile/parking-overview");
}

export function getAnalysisList() {
  return request("/analysis");
}

export function occupySpace(spaceCode, estimatedHours) {
  return request(`/mobile/spaces/${spaceCode}/occupy`, {
    method: "POST",
    body: JSON.stringify({ estimated_hours: estimatedHours }),
  });
}

export function releaseSpace(spaceCode) {
  return request(`/mobile/spaces/${spaceCode}/release`, {
    method: "POST",
  });
}
