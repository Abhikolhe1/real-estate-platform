import { resolveApiUrl, getAssetUrl, apiFetch } from '@repo/config';

/** Shared origin for API requests in the browser and during server rendering. */
export const API_URL = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

export { getAssetUrl, apiFetch };
