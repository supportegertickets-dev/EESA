const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

const isAppRequest = (value) => typeof value === 'string' && (
  value === '/api' ||
  value.startsWith('/api/') ||
  value.startsWith('/uploads/')
);

export const withApiBase = (value) => {
  if (!API_BASE_URL || !isAppRequest(value) || /^https?:\/\//i.test(value)) {
    return value;
  }
  return `${API_BASE_URL}${value}`;
};

export function configureApiFetch() {
  if (typeof window === 'undefined' || window.__eesaFetchConfigured) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = (resource, options = {}) => {
    const nextResource = typeof resource === 'string' ? withApiBase(resource) : resource;
    const shouldIncludeCredentials = typeof resource === 'string' && (isAppRequest(resource) || (API_BASE_URL && resource.startsWith(API_BASE_URL)));
    const nextOptions = shouldIncludeCredentials && !options.credentials
      ? { ...options, credentials: 'include' }
      : options;

    return nativeFetch(nextResource, nextOptions);
  };

  window.__eesaFetchConfigured = true;
}
