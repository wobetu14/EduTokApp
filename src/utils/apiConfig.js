import { Platform } from 'react-native';

// API base URL.
//
// Override per build/environment with EXPO_PUBLIC_API_URL — Expo inlines
// EXPO_PUBLIC_* vars at build time. A base URL is not a secret (it necessarily
// ships in every client), so a public-prefixed var is the correct tool here.
// When the var is unset, fall back to the IS_PROD switch below.
//
// SECURITY (CWE-319): production MUST be https:// so login credentials and JWTs
// are never sent in cleartext. PROD_URL currently targets a bare-IP HTTP
// endpoint pending TLS on the server. As soon as the API serves TLS, point
// EXPO_PUBLIC_API_URL (or PROD_URL) at the https domain AND set
// android.usesCleartextTraffic:false in app.json so a regression to http://
// fails loudly. See docs / security audit plan.
//
// true  → EC2 production: http://32.196.32.28/api  (nginx path-based routing, no port)
// false → local dev:       http://10.0.2.2:3000/api  (Android emulator)
//                          http://localhost:3000/api  (iOS simulator / web)
const IS_PROD = true;

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const PROD_URL = 'http://32.196.32.28/api'; // TODO(security): switch to https TLS endpoint
const DEV_URL  = `http://${DEV_HOST}:3000/api`;

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || (IS_PROD ? PROD_URL : DEV_URL);

// Fail loudly in development if production traffic isn't encrypted, so a
// cleartext endpoint can't silently ship. Warn (not throw): the live server is
// still HTTP today, and a hard failure would brick the app until TLS lands.
const isLoopback = /\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)/.test(BASE_URL);
if (__DEV__ && BASE_URL.startsWith('http://') && !isLoopback) {
  console.warn(
    `[security] API base URL "${BASE_URL}" uses cleartext HTTP — credentials ` +
    'and JWTs are exposed in transit (CWE-319). Move the API to https://.'
  );
}

// Host for shareable links. Uses an https universal-link / App-Link domain so
// chat apps (Telegram, Messenger, etc.) auto-detect it as a tappable link AND
// it opens the installed app (via associatedDomains / Android intentFilters in
// app.json). Change SHARE_HOST to the real domain; it must serve
// apple-app-site-association and /.well-known/assetlinks.json to verify.
export const SHARE_HOST = 'edutok.app';
export const SHARE_BASE_URL = `https://${SHARE_HOST}`;
