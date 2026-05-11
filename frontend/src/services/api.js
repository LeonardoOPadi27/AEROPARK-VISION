import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const login = async ({ correo, contrasena }) => {
  const { data } = await api.post("/auth/login", {
    correo,
    contrasena,
  });

  return data;
};

export default api;
