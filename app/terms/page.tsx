import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service | FundInTech" };

export default function Terms() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-200">
      <article className="mx-auto max-w-2xl space-y-4 leading-relaxed">
        <h1 className="text-3xl font-black text-white">Terms of Service</h1>
        <p className="text-sm text-slate-400">Last updated: November 2026</p>
        <p>
          These terms apply to the FundInTech website and content tool (the &quot;Service&quot;). By using the Service
          you agree to them.
        </p>
        <h2 className="text-xl font-bold text-white">1. What the Service does</h2>
        <p>
          The Service creates image posts about educational, funding and online-work opportunities. With the
          permission of the account owner, it publishes them to that owner&apos;s TikTok account through TikTok&apos;s
          official APIs.
        </p>
        <h2 className="text-xl font-bold text-white">2. Information only</h2>
        <p>
          Posts are for general information. Deadlines, eligibility and benefits can change. Always confirm the details
          on the official website of the organisation offering the opportunity before applying. FundInTech is not
          affiliated with the organisations it features unless stated, and it never asks for application fees.
        </p>
        <h2 className="text-xl font-bold text-white">3. TikTok account access</h2>
        <p>
          Only the account owner can connect a TikTok account. Access can be revoked at any time in TikTok under
          Settings and privacy → Security → Apps and services. Use of TikTok is also subject to TikTok&apos;s own Terms
          of Service.
        </p>
        <h2 className="text-xl font-bold text-white">4. Acceptable use</h2>
        <p>You may not use the Service to post misleading, fraudulent or unlawful content.</p>
        <h2 className="text-xl font-bold text-white">5. No warranty</h2>
        <p>
          The Service is provided &quot;as is&quot;, without warranties of any kind. To the extent the law allows,
          FundInTech is not liable for any loss arising from its use.
        </p>
        <h2 className="text-xl font-bold text-white">6. Changes and contact</h2>
        <p>
          We may update these terms, and the date above shows the latest version. Questions? Message{" "}
          <a className="text-teal-300 underline" href="https://www.tiktok.com/@fundntech">@fundntech</a> on TikTok.
        </p>
        <p>
          <Link className="text-teal-300 underline" href="/">← Back to home</Link>
        </p>
      </article>
    </main>
  );
}
