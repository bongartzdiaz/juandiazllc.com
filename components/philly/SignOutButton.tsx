"use client";

import { signOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn ghost"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await signOut();
          router.push("/");
          router.refresh();
        });
      }}
    >
      {pending ? "Signing out..." : "Sign out →"}
    </button>
  );
}
