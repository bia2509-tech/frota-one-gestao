import { and, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { authSessions, companyUsers } from "@/db/schema";

// Cloudflare Workers WebCrypto supports up to 100,000 PBKDF2 iterations.
const PBKDF2_ITERATIONS = 100_000;
export const LOCAL_SESSION_COOKIE = "frota_one_session";
const bytesToHex = (value: Uint8Array) => Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
const hexToBytes = (value: string) => new Uint8Array(value.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
export const randomSecret = (bytes = 32) => { const value = new Uint8Array(bytes); crypto.getRandomValues(value); return bytesToHex(value); };
export async function sha256(value: string) { return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))); }

export async function hashPassword(password: string) {
  const salt = randomSecret(16);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations: PBKDF2_ITERATIONS }, key, 256);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${salt}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterationsText, salt, expected] = stored.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > PBKDF2_ITERATIONS || !salt || !expected) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations }, key, 256);
  const actual = bytesToHex(new Uint8Array(bits));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

function readCookie(cookieHeader: string, name: string) {
  const pair = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}

export async function getLocalSessionUser() {
  const cookieHeader = (await headers()).get("cookie") || "";
  const token = readCookie(cookieHeader, LOCAL_SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const tokenHash = await sha256(token), now = new Date().toISOString();
  const [row] = await getDb().select({ membership: companyUsers }).from(authSessions)
    .innerJoin(companyUsers, eq(authSessions.companyUserId, companyUsers.id))
    .where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, now), isNull(authSessions.revokedAt), eq(companyUsers.active, true)))
    .limit(1);
  if (!row?.membership?.email) return null;
  return { userId: `local:${row.membership.id}`, displayName: row.membership.displayName || row.membership.email, email: row.membership.email, fullName: row.membership.displayName || null };
}
