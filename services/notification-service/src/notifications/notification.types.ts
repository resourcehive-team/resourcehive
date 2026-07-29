export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
}

export interface NotificationLookup {
  notificationId: string;
  userId: string;
}

export interface NotificationListQuery {
  userId: string;
  unreadOnly?: boolean;
  skip?: number;
  take?: number;
}

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
}
