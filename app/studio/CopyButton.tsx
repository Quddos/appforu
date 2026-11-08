"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-emerald-300"
    >
      {done ? "Copied!" : "Copy caption"}
    </button>
  );
}
