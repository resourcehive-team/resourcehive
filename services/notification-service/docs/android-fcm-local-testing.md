# Android FCM Local Testing

This flow verifies the real Firebase provider without deploying or changing
Booking Service. The authenticated test endpoint creates an in-app notification
and queues one FCM delivery for every active device belonging to the caller.
The endpoint is unavailable when `NODE_ENV=production`.

## 1. Configure Notification Service

Use a replacement service-account key that has never been exposed. Keep it
outside the repository and configure the root `.env` with a forward-slash
Windows path:

```dotenv
PORT=3003
FCM_ENABLED=true
FIREBASE_PROJECT_ID=resourcehive-96c6f
GOOGLE_APPLICATION_CREDENTIALS="C:/Users/Acer/.secrets/resourcehive-firebase-admin.json"
```

`KAFKA_ENABLED` may be either `true` or `false`; the local test route does not
depend on Kafka. Start the service from the repository root:

```powershell
pnpm.cmd --filter notification-service run start:dev
```

Verify that `providers.push` is `fcm`:

```powershell
$healthUri = "http://127.0.0.1:3003/health"
Invoke-RestMethod -Uri $healthUri | ConvertTo-Json -Depth 5
```

## 2. Register the Android application in Firebase

In Firebase Console, open project `resourcehive-96c6f`, select **Add app**, and
choose Android. Enter the exact `applicationId` from the Android app module's
`build.gradle.kts`; the value is case-sensitive and cannot be changed for that
Firebase app registration.

Download the Android client configuration and place it here in the Android
project:

```text
app/google-services.json
```

This is an Android client configuration file, not the Firebase Admin
service-account JSON used by Notification Service.

Add the Google Services plugin to the root `build.gradle.kts` using the version
shown by the Firebase setup wizard:

```kotlin
plugins {
    id("com.google.gms.google-services") version "4.5.0" apply false
}
```

Apply it and add Messaging in the app module's `build.gradle.kts`:

```kotlin
plugins {
    id("com.google.gms.google-services")
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:34.18.0"))
    implementation("com.google.firebase:firebase-messaging")
}
```

Use the current versions from the Firebase wizard if they are newer than these
examples.

## 3. Receive and refresh the FCM token

Declare notification permission and the messaging service in
`AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application ...>
    <service
        android:name=".notifications.ResourceHiveMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
</application>
```

Implement token refresh and foreground-message handling:

```kotlin
class ResourceHiveMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Persist locally, then upload after the user is authenticated.
        DeviceTokenStore.save(applicationContext, token)
        DeviceRegistrationWorker.enqueue(applicationContext)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        // Display message.notification using an Android notification channel
        // while the app is in the foreground.
        NotificationPresenter.show(applicationContext, message)
    }
}
```

`DeviceTokenStore`, `DeviceRegistrationWorker`, `NotificationPresenter`, and
`notificationApi` represent your app's persistence, background-work,
notification, and HTTP-client layers; connect these calls to the equivalents in
your Android architecture.

Request `POST_NOTIFICATIONS` at runtime on Android 13 or newer. Also request the
current token after login because `onNewToken` may have run before the user was
authenticated:

```kotlin
FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
    // Upload with the signed-in user's access token.
    notificationApi.registerDevice(
        authorization = "Bearer $accessToken",
        body = RegisterDeviceRequest(token = token, platform = "ANDROID"),
    )
}
```

The API contract is:

```http
POST /notifications/devices
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "token": "<FCM registration token>",
  "platform": "ANDROID"
}
```

Repeat registration whenever FCM returns a new token. Save the returned device
ID so the app can call `DELETE /notifications/devices/{deviceId}` on logout.

## 4. Reach the local backend from Android

Android cannot use the phone's `localhost` to reach the development computer:

- Android emulator: use `http://10.0.2.2:3003`.
- Physical device: use `http://<computer-LAN-IP>:3003`, keep both devices on
  the same network, and allow inbound TCP port `3003` through Windows Firewall.

For debug builds using HTTP, add `android:usesCleartextTraffic="true"` in
`app/src/debug/AndroidManifest.xml`. Do not enable cleartext traffic in release
builds.

## 5. Trigger the local test

After the Android app has registered its token, use the same user's access
token from PowerShell:

```powershell
$baseUri = "http://127.0.0.1:3003"
$accessToken = "<same-user-access-token>"
$headers = @{ Authorization = "Bearer $accessToken" }

Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUri/notifications/test-push" `
  -Headers $headers | ConvertTo-Json -Depth 5
```

Expected response:

```json
{
  "notificationId": "<uuid>",
  "pushDeliveriesQueued": 1
}
```

Within `DELIVERY_POLL_INTERVAL_MS`, the device should receive **ResourceHive
test notification**, and `GET /notifications` should contain the matching
in-app notification. If the app is open, its `onMessageReceived` implementation
must display the foreground notification.

Official references:

- [Add Firebase to an Android project](https://firebase.google.com/docs/android/setup)
- [Set up Firebase Cloud Messaging on Android](https://firebase.google.com/docs/cloud-messaging/android/get-started)
