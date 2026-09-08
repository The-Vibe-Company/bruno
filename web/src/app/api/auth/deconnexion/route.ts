import { cookieEfface } from "@/auth/session";

export function POST() {
  return new Response(null, { status: 204, headers: { "set-cookie": cookieEfface } });
}
