import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminToken,
  checkAdminPassword,
} from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function login(formData: FormData) {
  "use server";
  if (!checkAdminPassword(formData.get("password")))
    redirect("/admin/login?error=1");
  const token = await adminToken();
  (await cookies()).set(ADMIN_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect("/admin");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex-1 flex items-center justify-center bg-[#101418] text-white px-4">
      <form action={login} className="w-full max-w-xs flex flex-col gap-3">
        <h1 className="text-xl font-bold">Admin</h1>
        <input
          name="password"
          type="password"
          required
          autoFocus
          placeholder="Password"
          className="rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm"
        />
        {error && <p className="text-sm text-red-300">Password incorrecto</p>}
        <button className="h-11 rounded-lg bg-white text-black font-bold">
          Entrar
        </button>
      </form>
    </main>
  );
}
