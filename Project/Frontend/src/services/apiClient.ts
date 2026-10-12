export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/+$/,
  "",
)

export function apiRequest(path: string, init?: RequestInit) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  })
}
