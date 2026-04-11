import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Home page redirector.
 *
 * This server component runs on every request to the root path (/). It checks
 * whether there is an active session. If a user is authenticated, the
 * application forwards them to the dashboard; otherwise it takes them to
 * the sign‑in page. This ensures that the login screen is always the first
 * page for unauthenticated users and prevents 404 errors when navigating to
 * the root URL.
 */
export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/signin");
  }
}
