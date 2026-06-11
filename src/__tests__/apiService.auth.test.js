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
  it('saves tokens then re-fetches the full user from /users/me', async () => {
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: learnerUser } });
    get.mockResolvedValue({ data: { ...learnerUser, preferences: { preferred_categories: ['tech'], onboarding_completed: true } } });
    const user = await api.signIn('alice', 'pass');
    expect(saveTokens).toHaveBeenCalledWith('a', 'r');
    expect(get).toHaveBeenCalledWith('/users/me');
    expect(user.username).toBe('alice');
    expect(user.fullName).toBe('Alice');
    // Login response lacks the preferences relation — must come from /users/me
    expect(user.onboardingCompleted).toBe(true);
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
  it('routes profile fields to /users/me and notifications to /users/me/settings', async () => {
    patch.mockResolvedValue({});
    get.mockResolvedValue({
      data: { ...learnerUser, full_name: 'Bob', lang_pref: 'am', settings: { notifications_enabled: false } },
    });
    const user = await api.updateUser({ fullName: 'Bob', language: 'am', notificationsEnabled: false });
    expect(patch).toHaveBeenCalledWith('/users/me', { full_name: 'Bob', lang_pref: 'am' });
    expect(patch).toHaveBeenCalledWith('/users/me/settings', { notifications_enabled: false });
    expect(user.fullName).toBe('Bob');
    expect(user.notificationsEnabled).toBe(false);
  });

  it('routes learning preferences to /users/me/preferences', async () => {
    patch.mockResolvedValue({});
    get.mockResolvedValue({ data: { ...learnerUser, preferences: { preferred_categories: ['math'] } } });
    await api.updateUser({ preferences: ['math'] });
    expect(patch).toHaveBeenCalledWith('/users/me/preferences', { preferred_categories: ['math'] });
    expect(patch).not.toHaveBeenCalledWith('/users/me', expect.anything());
  });
});

// --- updatePreferences ---

describe('updatePreferences', () => {
  it('PATCHes categories and onboarding flag to /users/me/preferences', async () => {
    patch.mockResolvedValue({});
    get.mockResolvedValue({
      data: { ...learnerUser, preferences: { preferred_categories: ['tech'], onboarding_completed: true } },
    });
    const user = await api.updatePreferences({ preferences: ['tech'], onboardingCompleted: true });
    expect(patch).toHaveBeenCalledWith('/users/me/preferences', {
      preferred_categories: ['tech'],
      onboarding_completed: true,
    });
    expect(user.onboardingCompleted).toBe(true);
    expect(user.preferences).toEqual(['tech']);
  });
});

// --- updateSettings ---

describe('updateSettings', () => {
  it('PATCHes font scale and high contrast to /users/me/settings', async () => {
    patch.mockResolvedValue({});
    await api.updateSettings({ fontScale: 'lg', highContrast: true });
    expect(patch).toHaveBeenCalledWith('/users/me/settings', { font_scale: 'lg', high_contrast: true });
  });

  it('swallows server errors (fire-and-forget)', async () => {
    patch.mockRejectedValue(new Error('boom'));
    await expect(api.updateSettings({ fontScale: 'sm' })).resolves.toBeUndefined();
  });

  it('skips the request when no fields provided', async () => {
    await api.updateSettings({});
    expect(patch).not.toHaveBeenCalled();
  });
});
