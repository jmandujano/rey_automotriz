/**
 * Generic SWR fetcher for JSON endpoints. Wraps the native fetch API
 * and throws if the response is not OK. The returned promise resolves
 * to the parsed JSON body.
 */
export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    body: options?.body,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}