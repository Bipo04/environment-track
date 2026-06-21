const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3333";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
