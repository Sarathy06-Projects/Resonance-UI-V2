import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { account } from "@/db/schema";

// Tells the client, for whoever the request's session cookie resolves to,
// whether a real password has ever been set on this account - the signal
// /create-password uses to decide "show the form" vs "already done, skip
// straight through". Better Auth's own newUserCallbackURL only reflects
// whether an OAuth sign-in just created the user row *this call*; it can't
// tell an existing account that never finished password setup (e.g. closed
// the tab mid-flow) apart from one that has, so both /login and /signup's
// Google button route through here for every sign-in, not just first-time
// ones.
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [credentialAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, "credential")))
    .limit(1);

  return NextResponse.json({ hasPassword: Boolean(credentialAccount) });
}
