# Google Sign-In Setup

CampusNav accepts Google accounts ending in `@gmail.com` and asks each user to choose a username after sign-in.

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

The current implementation persists the signed-in profile locally with AsyncStorage. A backend user profile collection can be added later if usernames need to be shared across devices.
