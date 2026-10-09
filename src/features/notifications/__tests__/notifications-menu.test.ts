import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { notificationService } from "../services/notification-service";
import { apiClient } from "@/lib/api/client";

describe("Notifications System & Menu Contracts", () => {
  it("formats unread notifications with correct severities, categories and links", async () => {
    const originalRequest = apiClient.request;

    try {
      apiClient.request = async () => ({
        items: [
          {
            id: "notif-1",
            type: "publishing.failed",
            title: "Scheduled post failed",
            message: "Failed to post to LinkedIn",
            data: { scheduledPostId: "post-123" },
            readAt: null,
            createdAt: "2026-10-09T10:00:00.000Z",
            companyId: "comp-1",
            clientId: "client-1",
          },
          {
            id: "notif-2",
            type: "draft.review_requested",
            title: "Draft needs review",
            message: "Team member requested review",
            data: { draftId: "draft-456" },
            readAt: null,
            createdAt: "2026-10-09T09:30:00.000Z",
            companyId: "comp-1",
            clientId: "client-1",
          },
          {
            id: "notif-3",
            type: "invitation.received",
            title: "New member joined",
            message: "A new staff member accepted invitation",
            data: { clientId: "client-789" },
            readAt: "2026-10-09T09:00:00.000Z",
            createdAt: "2026-10-09T08:00:00.000Z",
            companyId: "comp-1",
            clientId: "client-1",
          },
        ],
        total: 3,
        unreadCount: 2,
        page: 1,
        limit: 10,
      } as any);

      // Unread only request
      const unreadRes = await notificationService.list({ pageSize: 10, filters: { readState: "unread" } });
      assert.equal(unreadRes.data.length, 3);
      assert.equal(unreadRes.pagination.total, 2, "Unread count mapped into pagination total when unread filter applied");

      // Verify item 1: publishing.failed
      const item1 = unreadRes.data[0]!;
      assert.equal(item1.id, "notif-1");
      assert.equal(item1.severity, "critical");
      assert.equal(item1.category, "integration");
      assert.equal(item1.isRead, false);
      assert.equal(item1.href, "/admin/content?post=post-123");

      // Verify item 2: draft.review_requested
      const item2 = unreadRes.data[1]!;
      assert.equal(item2.id, "notif-2");
      assert.equal(item2.severity, "info");
      assert.equal(item2.category, "system");
      assert.equal(item2.isRead, false);
      assert.equal(item2.href, "/admin/content-studio");

      // Verify item 3: invitation.received
      const item3 = unreadRes.data[2]!;
      assert.equal(item3.id, "notif-3");
      assert.equal(item3.severity, "info");
      assert.equal(item3.category, "security");
      assert.equal(item3.isRead, true);
      assert.equal(item3.href, "/admin/clients/client-789");

    } finally {
      apiClient.request = originalRequest;
    }
  });

  it("handles markRead and markAllRead successfully", async () => {
    const originalRequest = apiClient.request;
    const recordedCalls: Array<{ method: string; path: string }> = [];

    try {
      apiClient.request = async (spec) => {
        recordedCalls.push({ method: spec.method, path: spec.path });
        return { success: true } as any;
      };

      await notificationService.markRead("notif-999");
      assert.equal(recordedCalls.length, 1);
      assert.equal(recordedCalls[0]!.method, "PATCH");
      assert.equal(recordedCalls[0]!.path, "/notifications/notif-999/read");

      await notificationService.markAllRead();
      assert.equal(recordedCalls.length, 2);
      assert.equal(recordedCalls[1]!.method, "POST");
      assert.equal(recordedCalls[1]!.path, "/notifications/read-all");

    } finally {
      apiClient.request = originalRequest;
    }
  });
});
