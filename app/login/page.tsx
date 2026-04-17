import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to the Juan Diaz LLC operator hub.",
};

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
