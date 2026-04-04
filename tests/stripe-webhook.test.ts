import { describe, expect, it, vi, beforeEach } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: stripeMocks.constructEvent,
    },
  }),
}));

const prismaMocks = vi.hoisted(() => ({
  stripeEventFindUnique: vi.fn(),
  stripeEventCreate: vi.fn(),
  organizationUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeEvent: {
      findUnique: prismaMocks.stripeEventFindUnique,
      create: prismaMocks.stripeEventCreate,
    },
    organization: {
      updateMany: prismaMocks.organizationUpdateMany,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => (name === "stripe-signature" ? "t=1,v1=mock" : null),
  })),
}));

describe("POST /api/webhooks/stripe — checkout.session.completed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    stripeMocks.constructEvent.mockReturnValue({
      id: "evt_test_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_session_99",
          customer: "cus_test_abc",
          subscription: "sub_test_xyz",
        },
      },
    });
  });

  it("actualiza organización, persiste evento y en segunda petición deduplica sin segundo updateMany", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");

    prismaMocks.stripeEventFindUnique.mockResolvedValueOnce(null);
    prismaMocks.organizationUpdateMany.mockResolvedValueOnce({ count: 1 });
    prismaMocks.stripeEventCreate.mockResolvedValueOnce({ id: "row1" });

    const body = JSON.stringify({ type: "checkout.session.completed" });
    const req1 = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body,
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.received).toBe(true);
    expect(prismaMocks.organizationUpdateMany).toHaveBeenCalledTimes(1);
    expect(prismaMocks.stripeEventCreate).toHaveBeenCalledTimes(1);
    expect(prismaMocks.organizationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isSubscribed: true,
          subscriptionStatus: "active",
        }),
      }),
    );

    prismaMocks.stripeEventFindUnique.mockResolvedValueOnce({ id: "existing" });
    const req2 = new Request("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body,
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.deduplicated).toBe(true);
    expect(prismaMocks.organizationUpdateMany).toHaveBeenCalledTimes(1);
    expect(prismaMocks.stripeEventCreate).toHaveBeenCalledTimes(1);
  });
});
