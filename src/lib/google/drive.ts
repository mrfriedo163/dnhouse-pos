import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";
import { makeOAuthClient, type StoredTokens } from "./oauth";

/** Build an authenticated Drive client from stored tokens (auto-refreshes). */
export function driveFromTokens(
  tokens: StoredTokens,
  onRefresh?: (t: StoredTokens) => void,
): drive_v3.Drive {
  const auth = makeOAuthClient();
  auth.setCredentials(tokens);
  if (onRefresh) {
    auth.on("tokens", (t) => {
      // Google only returns refresh_token on first consent; preserve the existing one.
      onRefresh({ ...tokens, ...t, refresh_token: t.refresh_token ?? tokens.refresh_token });
    });
  }
  return google.drive({ version: "v3", auth });
}

/** Find a folder by name under a parent, or create it. Returns folder id. */
export async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<string> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const q =
    `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}'` +
    ` and trashed=false${parentClause}`;
  const res = await drive.files.list({ q, fields: "files(id,name)", pageSize: 1 });
  const found = res.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });
  return created.data.id!;
}

/** Ensure the full DN House folder tree exists; returns root folder id + web link. */
export async function ensureRootStructure(
  drive: drive_v3.Drive,
): Promise<{ rootId: string; rootUrl: string }> {
  const rootId = await ensureFolder(drive, "DN House");
  await Promise.all([
    ensureFolder(drive, "Bills", rootId),
    ensureFolder(drive, "Daily Reports", rootId),
    ensureFolder(drive, "Monthly Reports", rootId),
    ensureFolder(drive, "Declaration Drafts", rootId),
    ensureFolder(drive, "Templates", rootId),
    ensureFolder(drive, "Backups", rootId),
  ]);
  const meta = await drive.files.get({ fileId: rootId, fields: "webViewLink" });
  return { rootId, rootUrl: meta.data.webViewLink ?? `https://drive.google.com/drive/folders/${rootId}` };
}

/** yyyy-MM month bucket in the shop timezone. */
export function monthBucket(d: Date, timeZone = "Asia/Ho_Chi_Minh"): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" })
    .formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

/** Ensure DN House/<section>/<YYYY-MM>/ exists and return its folder id. */
export async function ensureDatedFolder(
  drive: drive_v3.Drive,
  rootId: string,
  section: "Bills" | "Daily Reports" | "Monthly Reports" | "Declaration Drafts",
  date: Date,
): Promise<string> {
  const sectionId = await ensureFolder(drive, section, rootId);
  return ensureFolder(drive, monthBucket(date), sectionId);
}

export interface UploadResult {
  fileId: string;
  webViewLink: string;
  name: string;
}

/** Upload a buffer as a file into a folder. */
export async function uploadFile(
  drive: drive_v3.Drive,
  folderId: string,
  fileName: string,
  mimeType: string,
  data: Buffer,
): Promise<UploadResult> {
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(data) },
    fields: "id,webViewLink,name",
  });
  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`,
    name: res.data.name ?? fileName,
  };
}
