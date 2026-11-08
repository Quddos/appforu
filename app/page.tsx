import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-black">
            Fund<span className="text-teal-400">In</span>Tech
          </h1>
          <p className="text-lg text-slate-300">
            FundInTech is a content tool for the TikTok creator account{" "}
            <a className="text-teal-300 underline" href="https://www.tiktok.com/@fundntech">@fundntech</a>. It creates
            image carousels about scholarships, fellowships, grants, conferences, free courses and legitimate ways to
            earn online, then publishes them to the creator&apos;s own TikTok account.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">How it works</h2>
          <ol className="list-decimal space-y-1 pl-5 text-slate-300">
            <li>The account owner signs in with TikTok (Login Kit) and approves access.</li>
            <li>Each day the app generates two 3-slide photo carousels from a reviewed list of opportunities.</li>
            <li>The carousels are sent to the owner&apos;s TikTok account with the Content Posting API.</li>
            <li>No data from other TikTok users is collected.</li>
          </ol>
        </section>

        <nav className="flex flex-wrap gap-3">
          <Link href="/studio" className="rounded-lg bg-teal-400 px-4 py-2 font-bold text-slate-900">
            Open Post Studio
          </Link>
          <a href="/api/tiktok/connect" className="rounded-lg bg-slate-800 px-4 py-2 font-bold">
            Connect TikTok
          </a>
        </nav>

        <footer className="flex gap-4 border-t border-slate-800 pt-4 text-sm text-slate-400">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <span>© {new Date().getFullYear()} FundInTech</span>
        </footer>
      </div>
    </main>
  );
}
