import { API_URL } from '@/config/api';

type Entry = { expires: number; promise: Promise<any> };
const requests = new Map<string, Entry>();

/** Only public data is cached. Tenant IDs are part of the key. Failed requests can be retried. */
export function publicJson<T = any>(path: string, tenantId = '', maxAge = 15_000): Promise<T> {
  const key = `${tenantId}:${path}`;
  const existing = requests.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  const promise = fetch(`${API_URL}${path}`, {
    signal: controller.signal,
    headers: tenantId ? { 'x-tenant-id': tenantId } : {},
  }).then(async response => {
    const data = await response.json();
    if (!response.ok || data?.success === false) throw new Error(data?.message || `Unable to load data (${response.status}).`);
    return data;
  }).catch(error => {
    requests.delete(key);
    throw new Error(error.name === 'AbortError' ? 'The server took too long to respond. Please try again.' : error.message);
  }).finally(() => clearTimeout(timer));
  if (requests.size > 100) requests.clear();
  requests.set(key, { expires: Date.now() + maxAge, promise });
  return promise;
}

export const getBuilder = (slug: string) => publicJson(`/builders/theme-by-slug/${encodeURIComponent(slug)}`);

export function builderUrl(path: string, slug: string) {
  if (/^(https?:|mailto:|tel:|\/\/|#)/i.test(path)) return path;
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return '/';
  const url = new URL(path, 'http://local');
  url.searchParams.set('builder', slug);
  return `${url.pathname}${url.search}${url.hash}`;
}
