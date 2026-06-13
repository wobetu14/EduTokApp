import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/apiConfig';

const ACCESS_KEY  = '@edutok_access_token';
const REFRESH_KEY = '@edutok_refresh_token';

// Abort any request that hasn't completed within this window so dead
// connections surface as a clear network error instead of hanging forever.
const REQUEST_TIMEOUT_MS = 30000;

const NETWORK_ERROR_MESSAGE = 'Network problem. Please check your connection and try again.';

// fetch with an AbortController timeout; maps aborts/connection failures
// to a typed ApiError(status 0) so callers can show a friendly message.
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE, { cause: String(e?.message ?? e) });
  } finally {
    clearTimeout(timer);
  }
};

// --- Token storage ---

export const saveTokens = async (accessToken, refreshToken) => {
  await AsyncStorage.multiSet([
    [ACCESS_KEY,  accessToken],
    [REFRESH_KEY, refreshToken],
  ]);
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
};

const getAccessToken  = () => AsyncStorage.getItem(ACCESS_KEY);
const getRefreshToken = () => AsyncStorage.getItem(REFRESH_KEY);

// --- Session-expired callback (avoids circular dependency with AuthContext) ---

let _onSessionExpired = null;

export const setSessionExpiredHandler = (fn) => {
  _onSessionExpired = fn;
};

// --- Token refresh (singleton in-flight promise) ---

let _refreshing = null;

const refreshAccessToken = async () => {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const token = await getRefreshToken();
    if (!token) throw new Error('no_refresh_token');
    const res = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
    if (!res.ok) throw new Error('refresh_failed');
    const data = await res.json();
    await saveTokens(data.data?.accessToken ?? data.accessToken, data.data?.refreshToken ?? data.refreshToken);
    return data.data?.accessToken ?? data.accessToken;
  })();
  try {
    return await _refreshing;
  } finally {
    _refreshing = null;
  }
};

// --- Typed error ---

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body   = body;
  }
}

// --- Core request ---

export const request = async (method, path, { body, auth = true, retry = true } = {}) => {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return request(method, path, { body, auth, retry: false });
    } catch {
      await clearTokens();
      _onSessionExpired?.();
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
  }

  let json;
  try { json = await res.json(); } catch { json = {}; }

  if (!res.ok) {
    throw new ApiError(res.status, json.message || json.error || 'Request failed', json);
  }

  return json;
};

// --- Multipart upload (FormData) ---

// Separate from request() because multipart must NOT set Content-Type (fetch
// adds the boundary itself) and the body is sent as-is, not JSON.stringify'd.
export const upload = async (path, formData, { retry = true } = {}) => {
  const headers = {};
  const token = await getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401 && retry) {
    try {
      await refreshAccessToken();
      return upload(path, formData, { retry: false });
    } catch {
      await clearTokens();
      _onSessionExpired?.();
      throw new ApiError(401, 'Session expired. Please sign in again.');
    }
  }

  let json;
  try { json = await res.json(); } catch { json = {}; }

  if (!res.ok) {
    throw new ApiError(res.status, json.message || json.error || 'Upload failed', json);
  }

  return json;
};

// --- Convenience wrappers ---

export const get   = (path, opts)        => request('GET',    path, opts);
export const post  = (path, body, opts)  => request('POST',   path, { ...opts, body });
export const patch = (path, body, opts)  => request('PATCH',  path, { ...opts, body });
export const del   = (path, opts)        => request('DELETE', path, opts);
