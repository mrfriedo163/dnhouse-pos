import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  createAdminClient: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentProfile: mocks.getCurrentProfile }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { POST } from "@/app/api/internal-users/ensure/route";

const emails = ["dung", "ngan", "thi", "chame"].map((name) => `${name}@dnhouse.local`);
const users = emails.map((email, i) => ({ id: `user-${i}`, email }));
const adminProfile: Profile = {
  id: "user-0",
  full_name: "Dung",
  role: "admin",
  active: true,
  created_at: "2026-07-01T00:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service");
  mocks.getCurrentProfile.mockResolvedValue(adminProfile);
  mocks.listUsers.mockResolvedValue({ data: { users }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.createAdminClient.mockReturnValue({
    auth: {
      admin: {
        listUsers: mocks.listUsers,
        createUser: mocks.createUser,
        updateUserById: mocks.updateUserById,
      },
    },
    from: () => ({ upsert: mocks.upsert }),
  });
});

afterEach(() => vi.unstubAllEnvs());

describe("internal account maintenance", () => {
  it.each([
    ["anonymous caller", null],
    ["staff", { ...adminProfile, role: "staff" }],
    ["inactive admin", { ...adminProfile, active: false }],
  ])("rejects %s before accessing privileged account APIs", async (_name, profile) => {
    mocks.getCurrentProfile.mockResolvedValue(profile);

    expect((await POST()).status).toBe(403);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("keeps existing credentials and profile settings intact", async () => {
    const savedProfiles = new Map(users.map(({ id }) => [id, { id, role: "staff", active: false }]));
    const before = [...savedProfiles.values()].map((profile) => ({ ...profile }));
    mocks.upsert.mockImplementation(async (profile, options) => {
      if (!savedProfiles.has(profile.id) || !options?.ignoreDuplicates) {
        savedProfiles.set(profile.id, profile);
      }
      return { error: null };
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect([...savedProfiles.values()]).toEqual(before);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("creates only a missing account and initializes its trigger-created profile", async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: users.slice(0, 3) }, error: null });
    mocks.createUser.mockResolvedValue({ data: { user: users[3] }, error: null });

    expect((await POST()).status).toBe(200);
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: emails[3] }));
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: users[3].id, role: "staff", active: true }),
      expect.objectContaining({ ignoreDuplicates: false }),
    );
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("does not change credentials when two maintenance calls overlap", async () => {
    const responses = await Promise.all([POST(), POST()]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("stops on an account lookup error without creating accounts", async () => {
    mocks.listUsers.mockResolvedValue({ data: null, error: new Error("lookup failed") });

    expect((await POST()).status).toBe(500);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
