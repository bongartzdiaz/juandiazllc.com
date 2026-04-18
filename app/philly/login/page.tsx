import type { Metadata } from "next";
import { LoginForm } from "@/components/philly/LoginForm";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
