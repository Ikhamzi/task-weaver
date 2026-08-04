import { env } from "../env.js";

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleRedirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResp.ok) {
    throw new Error(`Google token exchange failed: ${tokenResp.status} ${await tokenResp.text()}`);
  }
  const tokenJson = (await tokenResp.json()) as GoogleTokenResponse;

  const profileResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileResp.ok) {
    throw new Error(`Google userinfo fetch failed: ${profileResp.status} ${await profileResp.text()}`);
  }
  return (await profileResp.json()) as GoogleProfile;
}
