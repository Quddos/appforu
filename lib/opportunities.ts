import data from "@/data/opportunities.json";

export type Opportunity = {
  id: string;
  category: string;
  /** Only verified items are scheduled. Set true after checking the official site. */
  verified: boolean;
  kicker: string;
  title: string;
  subtitle: string;
  country: string;
  organizer: string;
  benefits: string[];
  eligibility: string[];
  deadline: string;
  link: string;
  steps: string[];
};

export const POSTS_PER_DAY = 2;
export const SLIDES_PER_POST = 3;

export const opportunities = data as Opportunity[];

export function getOpportunity(id: string): Opportunity | undefined {
  return opportunities.find((o) => o.id === id);
}

function dayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000,
  );
}

/**
 * Stateless rotation: each day gets the next POSTS_PER_DAY verified
 * opportunities, cycling through the list. No database needed.
 */
export function postsForDate(date = new Date()): Opportunity[] {
  const pool = opportunities.filter((o) => o.verified);
  if (pool.length === 0) return [];
  const start = (dayNumber(date) * POSTS_PER_DAY) % pool.length;
  return Array.from(
    { length: Math.min(POSTS_PER_DAY, pool.length) },
    (_, i) => pool[(start + i) % pool.length],
  );
}

const CATEGORY_TAGS: Record<string, string[]> = {
  Scholarship: ["#scholarship", "#fullyfunded", "#studyabroad", "#scholarships2027"],
  Fellowship: ["#fellowship", "#fullyfunded", "#opportunity"],
  Grant: ["#grants", "#funding", "#research"],
  Conference: ["#conference", "#fullyfunded", "#networking"],
  Publication: ["#research", "#publication", "#academia"],
  "Earn Online": ["#makemoneyonline", "#sidehustle", "#remotework"],
  Freelance: ["#freelance", "#freelancer", "#remotework"],
  "Free Course": ["#freecourse", "#techskills", "#learnontiktok"],
};

export function captionFor(o: Opportunity): { title: string; description: string } {
  const tags = [
    ...(CATEGORY_TAGS[o.category] ?? ["#opportunity"]),
    "#fundintech",
    "#fyp",
  ];
  const description = [
    `${o.title}: ${o.subtitle} 🎓`,
    "",
    `📍 ${o.country}`,
    `✅ ${o.benefits.slice(0, 3).join(" • ")}`,
    `⏰ ${o.deadline}`,
    `🔗 Apply: ${o.link}`,
    "",
    "Always apply on the OFFICIAL website. Never pay anyone to apply for you.",
    "Save this & share with someone who needs it 🙏",
    "",
    tags.join(" "),
  ].join("\n");
  return { title: `${o.kicker}: ${o.title}`.slice(0, 90), description };
}
