import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isAdminToken } from "./auth";

/** Call at the top of every admin page and admin server action. */
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  if (!(await isAdminToken(store.get(ADMIN_COOKIE)?.value)))
    redirect("/admin/login");
}
