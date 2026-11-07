/**
 * Resolves the base API URL from environment variables, falling back to a default URL.
 * Automatically strips trailing slashes for consistent endpoint concatenation.
 */
export function resolveApiUrl(
  envUrl?: string,
  fallbackUrl: string = 'http://localhost:3001'
): string {
  const url = envUrl || fallbackUrl;
  return url.replace(/\/+$/, '');
}

/**
 * Resolves static asset CDN URL from environment variables, falling back to local root ''.
 */
export function resolveAssetCdnUrl(
  envUrl?: string,
  fallbackUrl: string = ''
): string {
  if (!envUrl) return fallbackUrl;
  return envUrl.replace(/\/+$/, '');
}

/**
 * Universal asset URL helper.
 * If path is an absolute URL (http/https/data/blob), returns as-is.
 * Otherwise prefixes with NEXT_PUBLIC_ASSET_CDN_URL (or local '/').
 */
export function getAssetUrl(
  path: string,
  cdnUrl: string = typeof process !== 'undefined' ? (process.env?.NEXT_PUBLIC_ASSET_CDN_URL || '') : ''
): string {
  if (!path) return '';
  if (/^(?:https?:|\/\/|data:|blob:)/i.test(path)) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cdnUrl) {
    const base = cdnUrl.replace(/\/+$/, '');
    return `${base}${cleanPath}`;
  }
  return cleanPath;
}

/**
 * Centralized API fetch wrapper with configurable timeouts, abort signals, and JSON helpers.
 */
export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiFetch<T = unknown>(
  baseUrl: string,
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${cleanBase}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      signal: fetchOptions.signal || controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

