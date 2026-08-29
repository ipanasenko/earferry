# EarFerry for Android

> **Superseded.** The web app registers a Web Share Target (`share_target` in
> `public/manifest.webmanifest`), so an installed EarFerry PWA appears in the
> Android share sheet on its own and handles the share at `/share`. This APK is
> kept only until that is confirmed on a device, then this directory, its
> workflow and the `ANDROID_KEYSTORE_BASE64` secret go away. Prefer the PWA:
> sideloading needs the "install unknown apps" toggle and a Play Protect
> dismissal, and Google's developer-verification rules will tighten that further.

This tiny Android share target stores no account credentials and makes no network requests itself. Share a YouTube link to **EarFerry** and it opens the existing web app with that link queued for submission. Opening the app normally opens EarFerry.

Build the sideloadable APK with the installed Android SDK:

```sh
bun run android:build
```

The output is `android/build/earferry.apk`. It is signed with a locally generated debug key stored under the ignored `android/.debug/` directory.

Pushes that change `android/` automatically rebuild the APK and replace the asset on the `android-latest` GitHub release. The repository secret `ANDROID_KEYSTORE_BASE64` must contain the base64-encoded signing key used at `android/.debug/earferry-debug.keystore`.

Pull requests build and verify an APK with a temporary local key but do not publish it. Main-branch builds use the workflow run number as the monotonically increasing Android version code.
