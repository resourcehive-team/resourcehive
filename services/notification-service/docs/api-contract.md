# Notification API Contract

Authenticated user endpoints:

- `GET /notifications`
- `GET /notifications/:notificationId`
- `PATCH /notifications/:notificationId/read`
- `PATCH /notifications/read-all`
- `POST /notifications/push-subscriptions`
- `GET /notifications/push-subscriptions`
- `DELETE /notifications/push-subscriptions/:subscriptionId`

Register a browser with `{ "token": "<FCM web registration token>" }`.
Registering the same token again reactivates it for the authenticated user.
Deleting a subscription deactivates the token.
