/** Shared origin for API requests in the browser and during server rendering. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
