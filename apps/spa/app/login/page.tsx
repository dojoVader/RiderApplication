import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/form";
import LoginForm from "./login";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <AuthCard title="Sign in">
      {/* LoginForm reads ?next= via useSearchParams, which needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
