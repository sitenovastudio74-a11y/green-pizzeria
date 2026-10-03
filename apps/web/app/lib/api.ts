const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Wraps fetch for authenticated API calls. If the access token has expired
// (401), it silently tries to refresh it using the refresh token cookie and
// retries the original request once. Only if the refresh itself fails
// (refresh token also expired) does it send the user back to /login.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
  });

  if (res.status !== 401) {
    return res;
  }

  const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!refreshRes.ok) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gp_is_logged_in");
      window.location.href = "/login?expired=1";
    }
    return res;
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
  });
}
