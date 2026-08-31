# Notification API Contract

Authenticated user endpoints:

- `GET /notifications`
- `GET /notifications/:notificationId`
- `PATCH /notifications/:notificationId/read`
- `PATCH /notifications/read-all`
- `POST /notifications/devices`
- `GET /notifications/devices`
- `DELETE /notifications/devices/:deviceId`

Provider callback endpoint:

- `POST /notifications/webhooks/resend`

The webhook endpoint is authenticated by the Resend signature rather than a
user JWT. It must receive the unmodified request body.

