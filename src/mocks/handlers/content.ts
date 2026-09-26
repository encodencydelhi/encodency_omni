import { ApiError } from "@/types/api";
import type { MockRoutes } from "../lib/router";

interface MockCampaign {
  id: string;
  companyId: string;
  clientId: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  budget: { amount: string; amountMinor: string; currency: string } | null;
  startDate: string | null;
  endDate: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

interface MockDraft {
  id: string;
  companyId: string;
  clientId: string;
  campaignId: string | null;
  title: string | null;
  content: string;
  revision: number;
  reviewStatus: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewedAt: string | null;
  reviewedBy: { id: string; name: string | null; email: string } | null;
  reviewNote: string | null;
  media: Array<{ position: number; asset: any }>;
  variants: {
    id: string;
    channel: "FACEBOOK_PAGE" | "INSTAGRAM_ACCOUNT" | "LINKEDIN_ORGANIZATION";
    content: string | null;
    effectiveContent: string;
    updatedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

const mockCampaigns: MockCampaign[] = [
  {
    id: "camp-001",
    companyId: "development-company-id",
    clientId: "moksha-sewa",
    name: "Clean Ganga Awareness",
    status: "DRAFT",
    budget: { amount: "12400.00", amountMinor: "1240000", currency: "INR" },
    startDate: "2025-03-15",
    endDate: "2025-04-30",
    revision: 1,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "camp-002",
    companyId: "development-company-id",
    clientId: "moksha-sewa",
    name: "Volunteer Drive 2025",
    status: "DRAFT",
    budget: { amount: "8600.00", amountMinor: "860000", currency: "INR" },
    startDate: "2025-04-20",
    endDate: "2025-05-10",
    revision: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

export const mockDrafts: MockDraft[] = [
  {
    id: "draft-001",
    companyId: "development-company-id",
    clientId: "moksha-sewa",
    campaignId: "camp-001",
    title: "Ganga Clean Drive - Community Kickoff",
    content: "Small actions create a cleaner tomorrow. Join us this Saturday at Assi Ghat!",
    revision: 1,
    reviewStatus: "DRAFT",
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
    media: [],
    variants: [
      {
        id: "var-001-fb",
        channel: "FACEBOOK_PAGE",
        content: null,
        effectiveContent: "Small actions create a cleaner tomorrow. Join us this Saturday at Assi Ghat!",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "var-001-li",
        channel: "LINKEDIN_ORGANIZATION",
        content: "Announcing the 2025 Clean Ganga initiative in partnership with local community leaders.",
        effectiveContent: "Announcing the 2025 Clean Ganga initiative in partnership with local community leaders.",
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function requireClientScope(headers?: Record<string, string>): { companyId: string; clientId: string } {
  const companyId = headers?.["x-company-id"];
  const clientId = headers?.["x-client-id"];
  if (!companyId) {
    throw new ApiError({
      code: "NO_COMPANY_SELECTED",
      status: 400,
      message: "Company context required",
    });
  }
  if (!clientId) {
    throw new ApiError({
      code: "NO_CLIENT_SELECTED",
      status: 400,
      message: "Client context required",
    });
  }
  return { companyId, clientId };
}

export const contentRoutes: MockRoutes = {
  /* ── Campaigns ── */
  "GET /campaigns": ({ headers, query }) => {
    const { companyId, clientId } = requireClientScope(headers);
    let items = mockCampaigns.filter(
      (c) => c.companyId === companyId && (c.clientId === clientId || c.clientId === "moksha-sewa" || c.clientId === "development-client-id")
    );

    const search = query.search ? String(query.search).toLowerCase() : "";
    if (search) {
      items = items.filter((c) => c.name.toLowerCase().includes(search));
    }
    if (query.status) {
      items = items.filter((c) => c.status === query.status);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 25);
    const start = (page - 1) * limit;

    return {
      items: items.slice(start, start + limit),
      total: items.length,
      page,
      limit,
    };
  },

  "GET /campaigns/:id": ({ headers, params }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const campaign = mockCampaigns.find((c) => c.id === params.id && c.companyId === companyId);
    if (!campaign) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Campaign not found" });
    }
    return campaign;
  },

  "POST /campaigns": ({ headers, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const payload = (body ?? {}) as {
      name?: string;
      budget?: { amount: string; currency: string } | null;
      startDate?: string | null;
      endDate?: string | null;
      [key: string]: any;
    };

    if (!payload.name || payload.name.trim().length === 0) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "name must be 1-200 characters." });
    }

    const newCampaign: MockCampaign = {
      id: `camp-${Date.now().toString(36)}`,
      companyId,
      clientId,
      name: payload.name.trim(),
      status: "DRAFT",
      budget: payload.budget
        ? {
            amount: payload.budget.amount,
            amountMinor: String(Math.round(parseFloat(payload.budget.amount) * 100)),
            currency: payload.budget.currency,
          }
        : null,
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? null,
      revision: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(payload as any),
    };

    mockCampaigns.unshift(newCampaign);
    return newCampaign;
  },

  "PATCH /campaigns/:id": ({ headers, params, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const campaign = mockCampaigns.find((c) => c.id === params.id && c.companyId === companyId && c.clientId === clientId);
    if (!campaign) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Campaign not found" });
    }

    const payload = (body ?? {}) as {
      expectedRevision?: number;
      name?: string;
      budget?: { amount: string; currency: string } | null;
      startDate?: string | null;
      endDate?: string | null;
    };

    if (payload.expectedRevision === undefined || typeof payload.expectedRevision !== "number") {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "expectedRevision is required" });
    }

    // A2 Optimistic Concurrency check
    if (payload.expectedRevision !== campaign.revision) {
      throw new ApiError({
        code: "CONFLICT",
        status: 409,
        message: "This campaign was changed by someone else. Reload it before saving.",
      });
    }

    if (payload.name !== undefined) campaign.name = payload.name.trim();
    if (payload.budget !== undefined) {
      campaign.budget = payload.budget
        ? {
            amount: payload.budget.amount,
            amountMinor: String(Math.round(parseFloat(payload.budget.amount) * 100)),
            currency: payload.budget.currency,
          }
        : null;
    }
    if (payload.startDate !== undefined) campaign.startDate = payload.startDate;
    if (payload.endDate !== undefined) campaign.endDate = payload.endDate;

    campaign.revision += 1;
    campaign.updatedAt = new Date().toISOString();

    return campaign;
  },

  /* ── Content Drafts ── */
  "GET /content/drafts": ({ headers, query }) => {
    const { companyId, clientId } = requireClientScope(headers);
    let items = mockDrafts.filter((d) => d.companyId === companyId && d.clientId === clientId);

    if (query.campaignId) {
      items = items.filter((d) => d.campaignId === query.campaignId);
    }
    const search = query.search ? String(query.search).toLowerCase() : "";
    if (search) {
      items = items.filter((d) => (d.title ?? "").toLowerCase().includes(search) || d.content.toLowerCase().includes(search));
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 25);
    const start = (page - 1) * limit;

    const summaries = items.slice(start, start + limit).map((d) => ({
      id: d.id,
      clientId: d.clientId,
      campaignId: d.campaignId,
      title: d.title,
      contentPreview: d.content.slice(0, 200),
      channels: d.variants.map((v) => v.channel),
      revision: d.revision,
      reviewStatus: d.reviewStatus ?? "DRAFT",
      mediaCount: d.media?.length ?? 0,
      updatedAt: d.updatedAt,
    }));

    return {
      items: summaries,
      total: items.length,
      page,
      limit,
    };
  },

  "GET /content/drafts/:id": ({ headers, params }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const draft = mockDrafts.find((d) => d.id === params.id && d.companyId === companyId && d.clientId === clientId);
    if (!draft) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Draft not found" });
    }
    return draft;
  },

  "POST /content/drafts": ({ headers, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const payload = (body ?? {}) as {
      title?: string | null;
      campaignId?: string | null;
      content?: string;
      variants?: Record<string, { content?: string | null }>;
      assetIds?: string[];
    };

    if (!payload.content || payload.content.trim().length === 0) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "content must be non-blank text" });
    }

    const variantsMap = payload.variants ?? {};
    const channels = Object.keys(variantsMap);
    if (channels.length === 0) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "Select at least one channel in variants." });
    }

    const initialMedia = (payload.assetIds ?? []).map((id, index) => ({
      position: index,
      asset: {
        id,
        kind: "IMAGE",
        url: `https://mock.storage/asset-${id}.png`,
        mimeType: "image/png",
        format: "png",
        bytes: 102400,
        width: 800,
        height: 600,
        durationMs: null,
        uploadedAt: new Date().toISOString(),
      },
    }));

    const newDraft: MockDraft = {
      id: `draft-${Date.now().toString(36)}`,
      companyId,
      clientId,
      campaignId: payload.campaignId ?? null,
      title: payload.title ?? null,
      content: payload.content,
      revision: 1,
      reviewStatus: "DRAFT",
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
      media: initialMedia,
      variants: channels.map((channel, i) => {
        const c = variantsMap[channel]?.content ?? null;
        return {
          id: `var-${Date.now().toString(36)}-${i}`,
          channel: channel as any,
          content: c,
          effectiveContent: c ?? payload.content!,
          updatedAt: new Date().toISOString(),
        };
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDrafts.unshift(newDraft);
    return newDraft;
  },

  "PATCH /content/drafts/:id": ({ headers, params, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const draft = mockDrafts.find((d) => d.id === params.id && d.companyId === companyId && d.clientId === clientId);
    if (!draft) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Draft not found" });
    }

    const payload = (body ?? {}) as {
      expectedRevision?: number;
      title?: string | null;
      campaignId?: string | null;
      content?: string;
      variants?: Record<string, { content?: string | null }>;
    };

    if (payload.expectedRevision === undefined || typeof payload.expectedRevision !== "number") {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "expectedRevision is required" });
    }

    // A2 Optimistic Concurrency check
    if (payload.expectedRevision !== draft.revision) {
      throw new ApiError({
        code: "CONFLICT",
        status: 409,
        message: "This draft was changed by someone else. Reload it before saving.",
      });
    }

    if (payload.title !== undefined) draft.title = payload.title;
    if (payload.campaignId !== undefined) draft.campaignId = payload.campaignId;
    if (payload.content !== undefined) draft.content = payload.content;

    if (payload.variants) {
      for (const [channel, variantData] of Object.entries(payload.variants)) {
        const existing = draft.variants.find((v) => v.channel === channel);
        if (existing) {
          existing.content = variantData?.content ?? null;
          existing.effectiveContent = existing.content ?? draft.content;
          existing.updatedAt = new Date().toISOString();
        } else {
          draft.variants.push({
            id: `var-${Date.now().toString(36)}`,
            channel: channel as any,
            content: variantData?.content ?? null,
            effectiveContent: variantData?.content ?? draft.content,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    draft.revision += 1;
    // Any edit resets review to DRAFT
    draft.reviewStatus = "DRAFT";
    draft.updatedAt = new Date().toISOString();

    return draft;
  },

  "POST /content/drafts/:id/submit-review": ({ headers, params, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const draft = mockDrafts.find((d) => d.id === params.id && d.companyId === companyId && d.clientId === clientId);
    if (!draft) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Draft not found" });
    }
    const payload = (body ?? {}) as { expectedRevision: number };
    if (payload.expectedRevision !== draft.revision) {
      throw new ApiError({ code: "CONFLICT", status: 409, message: "revision_conflict" });
    }
    draft.reviewStatus = "PENDING_REVIEW";
    draft.revision += 1;
    draft.updatedAt = new Date().toISOString();
    return draft;
  },

  "POST /content/drafts/:id/approve": ({ headers, params, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const draft = mockDrafts.find((d) => d.id === params.id && d.companyId === companyId && d.clientId === clientId);
    if (!draft) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Draft not found" });
    }
    const payload = (body ?? {}) as { expectedRevision: number; reviewNote?: string };
    if (payload.expectedRevision !== draft.revision) {
      throw new ApiError({ code: "CONFLICT", status: 409, message: "revision_conflict" });
    }
    draft.reviewStatus = "APPROVED";
    draft.reviewNote = payload.reviewNote ?? null;
    draft.reviewedAt = new Date().toISOString();
    draft.reviewedBy = { id: "usr_reviewer", name: "Approver", email: "approver@example.com" };
    draft.revision += 1;
    draft.updatedAt = new Date().toISOString();
    return draft;
  },

  "POST /content/drafts/:id/reject": ({ headers, params, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const draft = mockDrafts.find((d) => d.id === params.id && d.companyId === companyId && d.clientId === clientId);
    if (!draft) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Draft not found" });
    }
    const payload = (body ?? {}) as { expectedRevision: number; reviewNote: string };
    if (!payload.reviewNote || !payload.reviewNote.trim()) {
      throw new ApiError({ code: "BAD_REQUEST", status: 400, message: "reviewNote is required" });
    }
    if (payload.expectedRevision !== draft.revision) {
      throw new ApiError({ code: "CONFLICT", status: 409, message: "revision_conflict" });
    }
    draft.reviewStatus = "REJECTED";
    draft.reviewNote = payload.reviewNote.trim();
    draft.reviewedAt = new Date().toISOString();
    draft.reviewedBy = { id: "usr_reviewer", name: "Reviewer", email: "reviewer@example.com" };
    draft.revision += 1;
    draft.updatedAt = new Date().toISOString();
    return draft;
  },

  "PUT /content/drafts/:id/media": ({ headers, params, body }) => {
    const { companyId, clientId } = requireClientScope(headers);
    const draft = mockDrafts.find((d) => d.id === params.id && d.companyId === companyId && d.clientId === clientId);
    if (!draft) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Draft not found" });
    }
    const payload = (body ?? {}) as { expectedRevision: number; assetIds: string[] };
    if (payload.expectedRevision !== draft.revision) {
      throw new ApiError({ code: "CONFLICT", status: 409, message: "revision_conflict" });
    }
    draft.media = (payload.assetIds ?? []).map((id, index) => ({
      position: index,
      asset: {
        id,
        kind: "IMAGE",
        url: `https://mock.storage/asset-${id}.png`,
        mimeType: "image/png",
        format: "png",
        bytes: 102400,
        width: 800,
        height: 600,
        durationMs: null,
        uploadedAt: new Date().toISOString(),
      },
    }));
    draft.reviewStatus = "DRAFT";
    draft.revision += 1;
    draft.updatedAt = new Date().toISOString();
    return draft;
  },

  "POST /media/upload": () => {
    const id = `asset_${Date.now().toString(36)}`;
    return {
      id,
      kind: "IMAGE",
      url: `https://mock.storage/asset-${id}.png`,
      mimeType: "image/png",
      format: "png",
      bytes: 102400,
      width: 1024,
      height: 768,
      durationMs: null,
      uploadedAt: new Date().toISOString(),
      usage: { drafts: 0, scheduledPosts: 0 },
    };
  },

  "GET /media": () => {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    };
  },

  "GET /media/:id": ({ params }) => {
    return {
      id: params.id,
      kind: "IMAGE",
      url: `https://mock.storage/asset-${params.id}.png`,
      mimeType: "image/png",
      format: "png",
      bytes: 102400,
      width: 1024,
      height: 768,
      durationMs: null,
      uploadedAt: new Date().toISOString(),
      usage: { drafts: 0, scheduledPosts: 0 },
    };
  },

  "DELETE /media/:id": () => {
    return { removed: true };
  },
};
