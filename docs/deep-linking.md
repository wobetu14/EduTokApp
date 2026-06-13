# Deep linking & shareable links

Shared course/lesson links use an **https universal link (iOS) / App Link (Android)**
so they are detected as tappable links in chat apps (Telegram, Messenger, WhatsApp…)
**and** open the installed app.

- Course: `https://edutok.app/course/<courseId>`
- Lesson: `https://edutok.app/lesson/<lessonId>?courseId=<courseId>`

The raw scheme (`edutok://course/<id>`) still works for in-app/dev use.

## What's already wired in the app

- `src/utils/apiConfig.js` — `SHARE_HOST` / `SHARE_BASE_URL` (change `SHARE_HOST` to the real domain).
- `src/utils/shareLinks.js` — builds the https links.
- `src/navigation/linking.js` — React Navigation `linking` config (prefixes + screen routes).
- `app.json` — iOS `associatedDomains` and Android App Link `intentFilters` (`autoVerify`).

## What you must host on the domain (required for links to OPEN the app)

The OS only opens the app for an https link if the domain proves it owns the app
by serving two static files. Until these are live, the links are still tappable
but open a browser.

### iOS — `apple-app-site-association`

Serve at **both** `https://edutok.app/.well-known/apple-app-site-association`
and `https://edutok.app/apple-app-site-association`, as `application/json`, **no
`.json` extension**, over valid HTTPS.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "<APPLE_TEAM_ID>.com.edutok.app",
        "paths": ["/course/*", "/lesson/*"]
      }
    ]
  }
}
```

Replace `<APPLE_TEAM_ID>` with your Apple Developer Team ID (Membership page).

### Android — `assetlinks.json`

Serve at `https://edutok.app/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.edutok.app",
      "sha256_cert_fingerprints": ["<SHA256_FINGERPRINT>"]
    }
  }
]
```

Get the fingerprint from the keystore that signs the release build:

```bash
keytool -list -v -keystore my-release-key.keystore -alias <alias>
# or, for EAS-managed credentials:
eas credentials
```

If using Google Play App Signing, also add the **Play-issued** SHA-256 (Play
Console → Setup → App signing).

## Testing

- Custom scheme works in a dev client / standalone build (not Expo Go):
  `npx uri-scheme open "edutok://course/<id>" --android`
- App Links verify only in an installed release/dev-client build with the files live:
  `npx uri-scheme open "https://edutok.app/course/<id>" --android`
- Verify Android association: `adb shell pm get-app-links com.edutok.app`

## Note on auth state

Links resolve only when the recipient is signed in and onboarded (when the
`NavigationContainer` is mounted). A link opened while logged out drops to the
auth screen and is not replayed after login.
