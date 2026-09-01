import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { NotificationRepository } from "./notification.repository";
import { NotificationReadService } from "./notification-read.service";

describe("NotificationReadService", () => {
  const repository = {
    isActiveUser: jest.fn(),
    findManyForUser: jest.fn(),
    findByIdForUser: jest.fn(),
    markReadForUser: jest.fn(),
    markAllReadForUser: jest.fn(),
    registerWebPush: jest.fn(),
    listWebPush: jest.fn(),
    removeWebPush: jest.fn(),
  } as unknown as NotificationRepository;
  const service = new NotificationReadService(repository);
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "organization-id",
    role: "member",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(repository, "isActiveUser").mockResolvedValue(true);
  });

  it("lists only notifications belonging to the authenticated user", async () => {
    const findMany = jest
      .spyOn(repository, "findManyForUser")
      .mockResolvedValue([]);
    await service.list(user, { unreadOnly: true, skip: 5, take: 10 });
    expect(findMany).toHaveBeenCalledWith({
      userId: "user-id",
      unreadOnly: true,
      skip: 5,
      take: 10,
    });
  });

  it("does not disclose an inaccessible notification", async () => {
    jest.spyOn(repository, "findByIdForUser").mockResolvedValue(null);
    await expect(
      service.findOne("notification-id", user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a suspended user even with a valid token", async () => {
    jest.spyOn(repository, "isActiveUser").mockResolvedValue(false);
    await expect(
      service.list(user, { unreadOnly: false, skip: 0, take: 50 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("marks only the authenticated user's unread notifications", async () => {
    const markAll = jest
      .spyOn(repository, "markAllReadForUser")
      .mockResolvedValue(3);
    await expect(service.markAllRead(user)).resolves.toEqual({
      updatedCount: 3,
    });
    expect(markAll).toHaveBeenCalledWith("user-id");
  });

  it("registers a trimmed web push token for the authenticated user", async () => {
    const registerWebPush = jest
      .spyOn(repository, "registerWebPush")
      .mockResolvedValue({
        id: "subscription-id",
        userId: user.userId,
        token: "fcm-token",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date("2026-09-01T08:00:00.000Z"),
      });

    await service.registerWebPush(user, { token: " fcm-token " });

    expect(registerWebPush).toHaveBeenCalledWith(user.userId, "fcm-token");
  });
});
