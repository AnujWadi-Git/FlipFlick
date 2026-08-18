import { Preferences, Recommendation } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function startSession(prefs: Preferences): Promise<Recommendation> {
  const res = await fetch(`${API_BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  return handle<Recommendation>(res);
}

export async function flipAgain(sessionId: string, surpriseMe = false): Promise<Recommendation> {
  const res = await fetch(`${API_BASE}/api/session/${sessionId}/flip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surprise_me: surpriseMe }),
  });
  return handle<Recommendation>(res);
}

export async function surpriseMe(prefs?: Pick<Preferences, "language" | "genres">): Promise<Recommendation> {
  const res = await fetch(`${API_BASE}/api/surprise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: prefs?.language ?? "Any language",
      genres: prefs?.genres ?? [],
    }),
  });
  return handle<Recommendation>(res);
}

export async function sendFeedback(sessionId: string, movieId: string, liked: boolean): Promise<void> {
  await fetch(`${API_BASE}/api/session/${sessionId}/feedback?movie_id=${encodeURIComponent(movieId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ liked }),
  });
}
