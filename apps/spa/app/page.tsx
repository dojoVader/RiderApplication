import Link from "next/link";
import { AuthNav } from "@/components/session";

const PATHS = [
  {
    role: "RIDER",
    title: "Become a rider",
    description: "Request a ride in seconds and track your trip from pickup to drop-off.",
    points: ["Set your pickup and destination", "Follow your ride from accepted to completed", "Keep a history of every trip"],
    cta: "Sign up to ride",
  },
  {
    role: "DRIVER",
    title: "Become a driver",
    description: "Pick up ride requests and drive on your own schedule.",
    points: ["Accept the rides you want", "Start and complete trips in the app", "Drive whenever it suits you"],
    cta: "Sign up to drive",
  },
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="text-lg font-semibold tracking-tight">Ride</span>
        <AuthNav />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-16 sm:px-6">
        <section className="py-12 text-center sm:py-20">
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Get where you&apos;re going, or get paid to drive.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-pretty text-zinc-600 dark:text-zinc-400">
            One app for both sides of the trip. Choose how you want to use Ride.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {PATHS.map((path) => (
            <article
              key={path.role}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h2 className="text-2xl font-semibold tracking-tight">{path.title}</h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{path.description}</p>
              <ul className="mt-6 flex flex-col gap-2 text-sm">
                {path.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:items-center">
                <Link
                  href={`/signup?role=${path.role}`}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {path.cta}
                </Link>
                <Link
                  href="/login"
                  className="text-center text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
                >
                  I already have an account
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
