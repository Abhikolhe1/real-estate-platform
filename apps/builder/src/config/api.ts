import { resolveApiUrl, getAssetUrl, apiFetch } from '@repo/config';

/** Configure the API without tying the portal to a temporary tunnel. */
export const API_URL = resolveApiUrl(process.env.NEXT_PUBLIC_API_URL);

export { getAssetUrl, apiFetch };
