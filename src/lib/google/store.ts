import { createAdminClient } from "../supabase/admin";
import { encryptJson, decryptJson, type EncryptedBlob } from "../crypto";
import { driveFromTokens } from "./drive";
import type { StoredTokens } from "./oauth";

/**
 * Load the single drive_settings row and return an authenticated Drive client.
 * Persists refreshed tokens back to the DB automatically.
 * Throws with code NOT_CONNECTED / TOKEN_INVALID for the caller to surface.
 */
export async function getConnectedDrive() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("drive_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!settings || !settings.connected || !settings.encrypted_token) {
    const err = new Error("Google Drive not connected");
    (err as any).code = "NOT_CONNECTED";
    throw err;
  }

  let tokens: StoredTokens;
  try {
    tokens = decryptJson<StoredTokens>(settings.encrypted_token as EncryptedBlob);
  } catch {
    const err = new Error("Stored Drive token could not be decrypted");
    (err as any).code = "TOKEN_INVALID";
    throw err;
  }

  const drive = driveFromTokens(tokens, async (refreshed) => {
    await admin
      .from("drive_settings")
      .update({ encrypted_token: encryptJson(refreshed), updated_at: new Date().toISOString() })
      .eq("id", settings.id);
  });

  return { drive, settings, admin };
}

export async function saveTokens(ownerProfileId: string, tokens: StoredTokens, rootId: string, rootUrl: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("drive_settings").select("id").limit(1).maybeSingle();
  const payload = {
    owner_profile_id: ownerProfileId,
    root_folder_id: rootId,
    root_folder_url: rootUrl,
    encrypted_token: encryptJson(tokens),
    connected: true,
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    await admin.from("drive_settings").update(payload).eq("id", existing.id);
  } else {
    await admin.from("drive_settings").insert(payload);
  }
}
