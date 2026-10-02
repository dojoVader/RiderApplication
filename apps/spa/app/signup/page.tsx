import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/form";
import SignupForm from "./signup";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <AuthCard title="Create account">
      {/* SignupForm reads ?next= via useSearchParams, which needs a Suspense boundary. */}
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
