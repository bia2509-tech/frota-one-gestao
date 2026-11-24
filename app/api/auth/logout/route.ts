import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { authSessions } from "@/db/schema";
import { LOCAL_SESSION_COOKIE, sha256 } from "@/lib/auth";
import { apiError } from "@/lib/tenant";

export async function POST() {
  try {
    const cookie = (await headers()).get("cookie") || "", raw = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${LOCAL_SESSION_COOKIE}=`))?.slice(LOCAL_SESSION_COOKIE.length + 1) || "";
    if (/^[a-f0-9]{64}$/i.test(raw)) await getDb().update(authSessions).set({ revokedAt: new Date().toISOString() }).where(eq(authSessions.tokenHash, await sha256(decodeURIComponent(raw))));
    return Response.json({ signedOut: true }, { headers: { "Set-Cookie": `${LOCAL_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` } });
  } catch (error) { return apiError(error); }
}
