# Google Sign-In Setup

CampusNav accepts verified Google accounts ending in `@gmail.com`. New users choose a username once; returning users sign in with the same Google account and keep their registered username.

## OAuth client IDs

Create OAuth 2.0 Client IDs in the Google Cloud project used by CampusNav:

- Web application client ID
- Android client ID, using the app package and SHA-1
- iOS client ID, using the bundle identifier

Add the IDs to the Expo environment before starting the app:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

For web development, add the Expo redirect URI shown by AuthSession to the OAuth client's authorized redirect URIs. Restart Expo after changing environment variables.

The app sends the Google access token to the API, which verifies the account with Google and looks up the Gmail in Supabase. Existing accounts are signed in directly. New accounts are asked to choose a username, which is saved to Supabase. Configure `EXPO_PUBLIC_API_URL` to point to the API server before starting the app.
