const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  return body;
}

export const getStats = () => request("/stats");
export const getIncidents = () => request("/incidents");
export const getCameras = () => request("/cameras");

export function analyzeVideo(video, cameraId) {
  const formData = new FormData();
  formData.append("video", video);
  formData.append("camera_id", cameraId);
  return request("/analyze", { method: "POST", body: formData });
}
