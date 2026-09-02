# Firebase Web Push Setup

The web-only notification flow has two Firebase configurations:

- Notification Service uses the private Firebase Admin service-account file.
- The web app uses public Firebase Web App values and a public VAPID key.

The public web values are safe to expose through `NEXT_PUBLIC_*`; the Firebase
Admin JSON must remain outside the repository.

## 1. Register the Firebase Web App

In Firebase Console, open project `resourcehive-96c6f`, select **Add app**, then
select the Web (`</>`) icon. Give it a nickname such as `ResourceHive Web` and
register it. Firebase Hosting is not required.

Copy these fields from the displayed `firebaseConfig` object:

- `apiKey`
- `authDomain`
- `projectId`
- `messagingSenderId`
- `appId`

Then open **Project settings > Cloud Messaging > Web Push certificates**,
generate a key pair, and copy the public key.

## 2. Configure the web app

Create `apps/web/.env.local` and set:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=resourcehive-96c6f
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Restart Next.js after changing these build-time variables:

```powershell
pnpm.cmd --filter frontend run dev
```

Localhost is accepted as a secure context for service-worker testing. A
deployed web app must use HTTPS.

## 3. Configure Notification Service

The root `.env` must contain:

```dotenv
FCM_ENABLED=true
FIREBASE_PROJECT_ID=resourcehive-96c6f
GOOGLE_APPLICATION_CREDENTIALS=C:/Users/Acer/.secrets/resourcehive-96c6f-firebase-adminsdk-fbsvc-df73822d4c.json
WEB_APP_URL=http://localhost:3000
```

First point `.env` at a disposable Neon development branch, using its direct
connection for `DATABASE_URL_UNPOOLED`. Then apply the web-only migration,
which removes `user_devices` and creates `web_push_subscriptions`:

```powershell
pnpm.cmd run db:migrate
```

For a host-run Notification Service, restart it with:

```powershell
pnpm.cmd --filter notification-service run start:dev
```

When the web app uses Caddy at `http://localhost:8000`, Caddy forwards
notification requests to the Docker container. Start that container with the
FCM override instead:

```powershell
docker compose -f docker-compose.yml -f docker-compose.fcm.yml up -d --build --force-recreate notification-service
```

The override mounts the host file from `GOOGLE_APPLICATION_CREDENTIALS` at
`/run/secrets/firebase-service-account.json` inside the container. The mount is
read-only, and the credential remains outside the repository.

Confirm that the rebuilt container contains the web-push routes:

```powershell
docker logs resourcehive-notification 2>&1 |
  Select-String "test-push|push-subscriptions|successfully started"
```

Do not run a second host instance of Notification Service at the same time. It
is not used by Caddy and can produce unrelated provider connection logs.

## 4. Test in the browser

1. Open `http://localhost:3000` in Chrome, Edge, or Firefox and sign in.
2. Open **Notifications** from the sidebar.
3. Select **Enable browser alerts** and allow the browser permission prompt.
4. Select **Send test** while running the web app in development mode.

The page should immediately contain the persisted in-app notification. The
Notification Service delivery poller sends the browser push within
`DELIVERY_POLL_INTERVAL_MS`. Background notifications are displayed by the
Firebase service worker; foreground messages refresh the page and display a
laptop notification.

The web app registers the FCM token through
`POST /notifications/push-subscriptions`. No WebSocket connection is used or
required.
