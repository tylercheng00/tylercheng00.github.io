# Android app (Google Play)

A Trusted Web Activity: the app opens https://tylercheng00.github.io/app.html full screen in Chrome's engine
(or a WebView if Chrome is missing). Changing `app.html` / `readiness.js` on the website updates the app;
a new build is only needed for the name, icon, colours or version.

- Package: `io.github.tylercheng00.readiness`
- Target SDK 36, min SDK 24

## Build

Needs JDK 17+ and the Android SDK (platform 36, build-tools 36). Create `local.properties` with `sdk.dir=…`
and `keystore.properties` (git-ignored) with the upload key:

```
storeFile=/path/to/upload-key.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

Then `./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab` (upload this to Play).
For each new upload, raise `versionCode` in `app/build.gradle`.

## Domain verification

`/.well-known/assetlinks.json` must list the SHA-256 fingerprint of every key that signs the installed app:
the upload key (for test installs of the APK) **and** the Play app signing key
(Play Console → Test and release → App integrity → App signing). Without the right fingerprint the app still works
but shows a browser address bar at the top.
