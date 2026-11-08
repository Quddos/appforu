import data from "@/data/opportunities.json";
import schedule from "@/data/schedule.json";

export type Perk = { e: string; t: string };

export type Opportunity = {
  id: string;
  /** "earn" posts go out in the morning slot, "academic" in the evening slot. */
  kind: "earn" | "academic";
  /** Only verified items are posted. Set true after checking the official site. */
  verified: boolean;
  label: string;
  /** Twemoji codepoints (files in assets/emoji). */
  hero: string;
  badges: string[];
  title: string;
  highlight: string;
  highlightLabel: string;
  subtitle: string;
  host: string;
  location: string;
  /** Last day the opportunity is open (YYYY-MM-DD). Expired items are never posted. */
  deadlineISO: string;
  deadline: string;
  perks: Perk[];
  eligibility: string[];
  steps: string[];
  link: string;
  sources: string[];
  tags: string[];
};

export const POSTS_PER_DAY = 2;
export const SLIDES_PER_POST = 3;
export const COMMENT_KEYWORD = "LINK";

export const opportunities = data as Opportunity[];
const plan = schedule as unknown as Record<string, string[]>;

export function getOpportunity(id: string): Opportunity | undefined {
  return opportunities.find((o) => o.id === id);
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function isOpen(o: Opportunity, date: Date) {
  return o.verified && o.deadlineISO >= isoDate(date);
}

/**
 * Posts for a UTC date: [earning post, academic post].
 * Uses data/schedule.json; any missing/expired slot falls back to a deterministic pick of
 * the right kind, so the two posts of a day are always different kinds and never the same.
 */
export function postsForDate(date = new Date()): Opportunity[] {
  const day = isoDate(date);
  const planned = (plan[day] ?? []).map(getOpportunity);
  const kinds: Opportunity["kind"][] = ["earn", "academic"];
  const dayNum = Math.floor(date.getTime() / 86_400_000);

  return kinds.flatMap((kind, slot) => {
    const p = planned[slot];
    if (p && p.kind === kind && isOpen(p, date)) return [p];
    const pool = opportunities.filter((o) => o.kind === kind && isOpen(o, date));
    return pool.length ? [pool[dayNum % pool.length]] : [];
  });
}

/** Scheduled dates from today onward (for the studio page). */
export function upcomingDates(from = new Date(), days = 7): Date[] {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 12);
  return Array.from({ length: days }, (_, i) => new Date(start + i * 86_400_000));
}

export function captionFor(o: Opportunity): { title: string; description: string } {
  const tags = [...o.tags, "#fundintech", "#opportunity", "#fyp"];
  const description = [
    `${o.title}: ${o.highlight} ${o.highlightLabel.toLowerCase()} 🔥`,
    "",
    `👉 ${o.subtitle}`,
    `📍 ${o.location}`,
    `⏰ Deadline: ${o.deadline}`,
    `🔗 Official site: ${o.link}`,
    "",
    `💬 Comment "${COMMENT_KEYWORD}" and I'll send you the direct application link + tips!`,
    "📌 Save this & tag a friend who needs it.",
    "⚠️ Always apply on the official website. Never pay an agent.",
    "",
    tags.join(" "),
  ].join("\n");
  return { title: `${o.title} | ${o.highlight}`.slice(0, 90), description };
}
