import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy | FundInTech" };

export default function Privacy() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-200">
      <article className="mx-auto max-w-2xl space-y-4 leading-relaxed">
        <h1 className="text-3xl font-black text-white">Privacy Policy</h1>
        <p className="text-sm text-slate-400">Last updated: November 2026</p>
        <p>This policy explains what information the FundInTech website and content tool handles, and why.</p>
        <h2 className="text-xl font-bold text-white">Information we access</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>TikTok account connection:</b> when the account owner signs in with TikTok, we receive an access token
            and a refresh token. They are used only to publish posts to that account, and the refresh token is stored as
            a private server setting.
          </li>
          <li>
            <b>Basic profile info</b> (scope <code>user.info.basic</code>): used only to confirm which account is
            connected.
          </li>
          <li>
            We do not collect data about other TikTok users, followers or viewers, and we do not use advertising
            trackers.
          </li>
        </ul>
        <h2 className="text-xl font-bold text-white">How we use it</h2>
        <p>
          Tokens are used to upload FundInTech&apos;s own image posts to the connected account through TikTok&apos;s
          Content Posting API. We do not sell or share this information with anyone.
        </p>
        <h2 className="text-xl font-bold text-white">Retention and deletion</h2>
        <p>
          Tokens are kept only while the connection is active. To remove access, revoke it in TikTok under Settings and
          privacy → Security → Apps and services, or ask us to delete the stored token.
        </p>
        <h2 className="text-xl font-bold text-white">Hosting</h2>
        <p>
          The site is hosted on Vercel, which may keep standard server logs, such as IP address and request time, for
          security and reliability.
        </p>
        <h2 className="text-xl font-bold text-white">Contact</h2>
        <p>
          Questions or deletion requests: message{" "}
          <a className="text-teal-300 underline" href="https://www.tiktok.com/@fundntech">@fundntech</a> on TikTok.
        </p>
        <p>
          <Link className="text-teal-300 underline" href="/">← Back to home</Link>
        </p>
      </article>
    </main>
  );
}
