/** Small fetch wrapper for the browser. Throws an Error whose message is safe to show to users. */
export async function api<T = unknown>(
  url: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const details = Array.isArray(data?.details)
      ? data.details
          .map((d: { path?: string; message: string }) =>
            d.path ? `${d.path}: ${d.message}` : d.message,
          )
          .join("; ")
      : "";
    throw new Error(details || data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}
