import { google } from "googleapis";

export const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export function makeOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars missing");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildAuthUrl(state: string): string {
  const oauth2 = makeOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: "offline",     // get a refresh token
    prompt: "consent",          // force refresh token on reconnect
    scope: DRIVE_SCOPES,
    state,
  });
}

export interface StoredTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string | null;
  expiry_date?: number | null;
}

export async function exchangeCode(code: string): Promise<StoredTokens> {
  const oauth2 = makeOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  return tokens as StoredTokens;
}
