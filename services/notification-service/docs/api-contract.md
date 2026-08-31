# Notification API Contract

Authenticated user endpoints:

- `GET /notifications`
- `GET /notifications/:notificationId`
- `PATCH /notifications/:notificationId/read`
- `PATCH /notifications/read-all`
- `POST /notifications/devices`
- `GET /notifications/devices`
- `DELETE /notifications/devices/:deviceId`

Register a device with `{ "token": "<FCM registration token>", "platform":
"ANDROID" | "IOS" }`. Registering the same token again reactivates it for the
same user. Deleting a device deactivates the token.
