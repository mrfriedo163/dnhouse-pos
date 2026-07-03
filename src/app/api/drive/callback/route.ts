import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { exchangeCode } from "@/lib/google/oauth";
import { driveFromTokens, ensureRootStructure } from "@/lib/google/drive";
import { saveTokens } from "@/lib/google/store";

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.redirect(new URL("/login", request.url), 302);
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err || !code) return NextResponse.redirect(new URL("/drive?error=denied", request.url), 302);

  try {
    const tokens = await exchangeCode(code);
    const drive = driveFromTokens(tokens);
    const { rootId, rootUrl } = await ensureRootStructure(drive);
    await saveTokens(profile.id, tokens, rootId, rootUrl);
    return NextResponse.redirect(new URL("/drive?connected=1", request.url), 302);
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/drive?error=${encodeURIComponent(e?.message ?? "oauth")}`, request.url), 302);
  }
}
