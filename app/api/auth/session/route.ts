import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getLocalSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getLocalSessionUser() || await getChatGPTUser();
  return Response.json(user ? { authenticated: true, user: { name: user.displayName, email: user.email } } : { authenticated: false }, { status: user ? 200 : 401 });
}
