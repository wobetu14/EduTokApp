jest.mock('../services/httpClient', () => ({
  get:         jest.fn(),
  post:        jest.fn(),
  patch:       jest.fn(),
  del:         jest.fn(),
  saveTokens:  jest.fn().mockResolvedValue(),
  clearTokens: jest.fn().mockResolvedValue(),
  setSessionExpiredHandler: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const { post, get, patch, saveTokens, clearTokens } = require('../services/httpClient');
const api = require('../services/apiService');

const learnerUser = {
  id: 'u1', username: 'alice', full_name: 'Alice', phone: '', bio: '',
  avatar_url: null, is_phone_verified: false, lang_pref: 'en',
  notifications_enabled: true, role: 'learner', created_at: '2025-01-01',
  preferences: { preferred_categories: [] },
};

beforeEach(() => jest.clearAllMocks());

// --- signIn ---

describe('signIn', () => {
  it('saves tokens and returns mapped user for learner', async () => {
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: learnerUser } });
    const user = await api.signIn('alice', 'pass');
    expect(saveTokens).toHaveBeenCalledWith('a', 'r');
    expect(user.username).toBe('alice');
    expect(user.fullName).toBe('Alice');
  });

  it('blocks org_admin and does not save tokens', async () => {
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: { ...learnerUser, role: 'org_admin' } } });
    await expect(api.signIn('admin', 'pass')).rejects.toThrow('students only');
    expect(saveTokens).not.toHaveBeenCalled();
  });

  it('blocks super_admin and does not save tokens', async () => {
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: { ...learnerUser, role: 'super_admin' } } });
    await expect(api.signIn('superadmin', 'pass')).rejects.toThrow('students only');
    expect(saveTokens).not.toHaveBeenCalled();
  });

  it('blocks instructor and does not save tokens', async () => {
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: { ...learnerUser, role: 'instructor' } } });
    await expect(api.signIn('prof', 'pass')).rejects.toThrow('students only');
    expect(saveTokens).not.toHaveBeenCalled();
  });

  it('throws with requires2fa and challengeToken on 2FA response', async () => {
    post.mockResolvedValue({ data: { requires2fa: true, challengeToken: 'ct-abc', two_fa_method: 'phone' } });
    let thrown;
    try { await api.signIn('alice', 'pass'); }
    catch (e) { thrown = e; }
    expect(thrown).toBeDefined();
    expect(thrown.requires2fa).toBe(true);
    expect(thrown.challengeToken).toBe('ct-abc');
    expect(thrown.twoFaMethod).toBe('phone');
    expect(saveTokens).not.toHaveBeenCalled();
  });
});

// --- signUp ---

describe('signUp', () => {
  it('calls /auth/register with snake_case fields, saves tokens, returns user', async () => {
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: learnerUser } });
    const user = await api.signUp({ username: 'alice', fullName: 'Alice', phone: '+1', password: 'pw' });
    const [path, body] = post.mock.calls[0];
    expect(path).toBe('/auth/register');
    expect(body.full_name).toBe('Alice');
    expect(body.username).toBe('alice');
    expect(saveTokens).toHaveBeenCalledWith('a', 'r');
    expect(user.username).toBe('alice');
  });
});

// --- fetchCurrentUser ---

describe('fetchCurrentUser', () => {
  it('returns mapped learner user', async () => {
    get.mockResolvedValue({ data: learnerUser });
    const user = await api.fetchCurrentUser();
    expect(user.username).toBe('alice');
  });

  it('clears tokens and throws for non-learner role', async () => {
    get.mockResolvedValue({ data: { ...learnerUser, role: 'org_admin' } });
    await expect(api.fetchCurrentUser()).rejects.toThrow('Non-learner account');
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });
});

// --- signOut ---

describe('signOut', () => {
  it('calls /auth/logout and clears tokens', async () => {
    post.mockResolvedValue({});
    await api.signOut();
    expect(post).toHaveBeenCalledWith('/auth/logout', {});
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });

  it('clears tokens even when /auth/logout fails', async () => {
    post.mockRejectedValue(new Error('network error'));
    await api.signOut();
    expect(clearTokens).toHaveBeenCalledTimes(1);
  });
});

// --- updateUser ---

describe('updateUser', () => {
  it('maps camelCase fields to snake_case body', async () => {
    patch.mockResolvedValue({ data: { ...learnerUser, full_name: 'Bob', lang_pref: 'am' } });
    await api.updateUser({ fullName: 'Bob', language: 'am', notificationsEnabled: false });
    const [path, body] = patch.mock.calls[0];
    expect(path).toBe('/users/me');
    expect(body.full_name).toBe('Bob');
    expect(body.lang_pref).toBe('am');
    expect(body.notifications_enabled).toBe(false);
  });
});
