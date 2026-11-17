const configuredApiOrigin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const isStaticDemoMode = import.meta.env.PROD && !configuredApiOrigin;

export function apiUrl(path: string): string {
  const normalizedPath = `/${path.replace(/^\/+/, '')}`;
  if (configuredApiOrigin) return `${configuredApiOrigin}${normalizedPath}`;
  return `${import.meta.env.BASE_URL}${normalizedPath.slice(1)}`;
}
