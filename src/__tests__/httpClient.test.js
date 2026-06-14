import AsyncStorage from '@react-native-async-storage/async-storage';

// Tokens now live in SecureStore (Keychain/Keystore). Back it with an in-memory
// store so the storage/auth-header/refresh tests exercise the real code path.
const mockSecureStore = new Map();
jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn((k) => Promise.resolve(mockSecureStore.has(k) ? mockSecureStore.get(k) : null)),
  setItemAsync:    jest.fn((k, v) => { mockSecureStore.set(k, v); return Promise.resolve(); }),
  deleteItemAsync: jest.fn((k) => { mockSecureStore.delete(k); return Promise.resolve(); }),
}));

import {
  saveTokens,
  clearTokens,
  getAccessToken,
  setSessionExpiredHandler,
  request,
  get,
  post,
  ApiError,
} from '../services/httpClient';

// Reset module state between tests so singleton _refreshing doesn't leak
beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear();
  mockSecureStore.clear();
  setSessionExpiredHandler(null);
});

// Helper: make fetch return a JSON response
const mockFetch = (status, body) => {
  global.fetch = jest.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  });
};

// --- Token storage ---

describe('saveTokens / clearTokens', () => {
  it('saves access and refresh tokens to SecureStore', async () => {
    await saveTokens('access-abc', 'refresh-xyz');
    expect(mockSecureStore.get('edutok_access_token')).toBe('access-abc');
    expect(mockSecureStore.get('edutok_refresh_token')).toBe('refresh-xyz');
    expect(await getAccessToken()).toBe('access-abc');
  });

  it('clears both tokens', async () => {
    await saveTokens('access-abc', 'refresh-xyz');
    await clearTokens();
    expect(mockSecureStore.has('edutok_access_token')).toBe(false);
    expect(mockSecureStore.has('edutok_refresh_token')).toBe(false);
    expect(await getAccessToken()).toBeNull();
  });

  it('migrates a legacy AsyncStorage token into SecureStore on read', async () => {
    await AsyncStorage.setItem('@edutok_access_token', 'legacy-access');
    // First read pulls from AsyncStorage, persists to SecureStore, and clears legacy.
    expect(await getAccessToken()).toBe('legacy-access');
    expect(mockSecureStore.get('edutok_access_token')).toBe('legacy-access');
    expect(await AsyncStorage.getItem('@edutok_access_token')).toBeNull();
  });
});

// --- Auth header ---

describe('request — auth header', () => {
  it('attaches Bearer token when auth: true and token exists', async () => {
    await saveTokens('my-token', 'r');
    mockFetch(200, { success: true });
    await request('GET', '/test');
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer my-token');
  });

  it('omits Authorization header when auth: false', async () => {
    await saveTokens('my-token', 'r');
    mockFetch(200, { success: true });
    await request('GET', '/test', { auth: false });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['Authorization']).toBeUndefined();
  });

  it('omits Authorization header when no token stored', async () => {
    mockFetch(200, { success: true });
    await request('GET', '/test');
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['Authorization']).toBeUndefined();
  });
});

// --- 401 handling and token refresh ---

describe('request — 401 token refresh', () => {
  it('refreshes token and retries on 401', async () => {
    await saveTokens('expired-token', 'refresh-token');

    // First call: 401; second call (refresh): 200 with new tokens; third call (retry): 200
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: jest.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({
        status: 200, ok: true,
        json: jest.fn().mockResolvedValue({
          data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
        }),
      })
      .mockResolvedValueOnce({ status: 200, ok: true, json: jest.fn().mockResolvedValue({ ok: true }) });

    const result = await request('GET', '/resource');
    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    // New token saved
    expect(await getAccessToken()).toBe('new-access');
  });

  it('clears tokens and calls session-expired handler when refresh fails', async () => {
    await saveTokens('expired', 'bad-refresh');
    const onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);

    global.fetch = jest.fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: jest.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({ status: 401, ok: false, json: jest.fn().mockResolvedValue({}) });

    await expect(request('GET', '/resource')).rejects.toThrow('Session expired');
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(await getAccessToken()).toBeNull();
  });

  it('does not retry more than once (retry: false stops the loop)', async () => {
    await saveTokens('expired', 'refresh-token');

    global.fetch = jest.fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: jest.fn().mockResolvedValue({}) })
      .mockResolvedValueOnce({
        status: 200, ok: true,
        json: jest.fn().mockResolvedValue({ data: { accessToken: 'new', refreshToken: 'new-r' } }),
      })
      .mockResolvedValueOnce({ status: 401, ok: false, json: jest.fn().mockResolvedValue({}) });

    const onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);
    // After a successful refresh, a second 401 is a permissions issue (not a stale token).
    // We throw ApiError but do NOT clear tokens or call session-expired.
    await expect(request('GET', '/resource')).rejects.toMatchObject({ status: 401 });
    expect(onExpired).not.toHaveBeenCalled();
  });
});

// --- Non-401 errors ---

describe('request — error handling', () => {
  it('throws ApiError with status and message on non-2xx', async () => {
    mockFetch(400, { message: 'Bad request' });
    await expect(request('GET', '/bad')).rejects.toMatchObject({
      status: 400,
      message: 'Bad request',
    });
  });

  it('throws ApiError with fallback message when body has no message', async () => {
    mockFetch(500, {});
    await expect(request('GET', '/err')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed',
    });
  });

  it('returns parsed JSON on success', async () => {
    mockFetch(200, { data: { id: '123' } });
    const result = await get('/resource');
    expect(result).toEqual({ data: { id: '123' } });
  });
});

// --- Convenience wrappers ---

describe('convenience wrappers', () => {
  it('post sends JSON body', async () => {
    mockFetch(201, { success: true });
    await post('/items', { name: 'test' });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ name: 'test' });
  });
});
