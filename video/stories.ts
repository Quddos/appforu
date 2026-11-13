/**
 * Compile story scripts (video/stories/*.story) into episode JSON (video/episodes/<id>.json)
 * for the 3D stickman renderer. Usage: npx tsx video/stories.ts [file.story ...]
 *
 * Format:
 *   id: q-001
 *   brand: bingebrain | fundintech
 *   title: ...
 *   caption: ...
 *   opportunity: <id in data/opportunities.json>   (optional)
 *   hook: BIG HOOK TEXT | SMALL SUB
 *   cta: Comment LINK | 1f447 Official link in bio | 23f0 Deadline: 15 Dec 2026
 *   cast: tomy                                      (guests; Quddus is always there)
 *
 *   == cafe | PLACE TAG | backdrop prompt | layout +extraProp
 *   tomy (worried, close): What she says.
 *   quddus (point): What he says.
 *   > 1f4b5 | CARD TITLE | 1f3eb Line one | 2708 Line two
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const castDb = JSON.parse(readFileSync(path.join(root, "video", "cast.json"), "utf8"));

const ACTS = ["talk", "wave", "cheer", "facepalm", "think", "shrug", "point", "phone", "type", "worried", "thumbs"];
const MOODS = ["happy", "worried", "think", "shock", "cool"];
const SHOTS = ["wide", "two", "close", "card"];

/** How the voice should say things the captions spell differently. */
const SAY: [RegExp, string][] = [
  [/\bQuddus\b/g, "Kuddus"],
  [/\bMBZUAI\b/g, "M B Z U AI"],
  [/\bUAE\b/g, "U.A.E."],
  [/\bUK\b/g, "U.K."],
  [/\bUSA\b/g, "U.S.A."],
  [/\bUS\b/g, "U.S."],
  [/\bEU\b/g, "E.U."],
  [/\bCVs?\b/g, "C.V."],
  [/\bAI\b/g, "A.I."],
  [/\bPhD\b/g, "P.H.D."],
  [/\bMSc\b/g, "M.Sc."],
  [/\bSOP\b/g, "S.O.P."],
  [/\bIELTS\b/g, "eye-elts"],
  [/\bDAAD\b/g, "D.A.A.D."],
  [/\bGPA\b/g, "G.P.A."],
  [/\bNGO\b/g, "N.G.O."],
  [/\bDM\b/g, "D.M."],
  [/€([\d,]+)/g, "$1 euros"],
  [/£([\d,]+)/g, "$1 pounds"],
  [/\$([\d,]+)/g, "$1 dollars"],
  [/(\d+)\/hr\b/g, "$1 an hour"],
  [/(\d+)\/month\b/g, "$1 a month"],
  [/\bvs\b/g, "versus"],
  [/&/g, "and"],
];
const sayOf = (t: string) => SAY.reduce((s, [re, to]) => s.replace(re, to), t);

type Place = [number, number, number, number?];
type Layout = { at: (g: string) => Record<string, Place>; sit?: (g: string) => string[]; props?: string[]; walkIn?: boolean; phone?: boolean };

const LAYOUTS: Record<string, Layout> = {
  stand: { at: (g) => ({ [g]: [-0.75, 0, 0.4], quddus: [0.75, 0, 0.4] }) },
  walkin: { at: (g) => ({ [g]: [-0.2, 0, 0.3, 0.2], quddus: [4.2, 0, -0.6] }), walkIn: true },
  cafe: { at: (g) => ({ [g]: [-0.82, 0, 0, 1.15], quddus: [0.82, 0, 0, -1.15] }), sit: (g) => [g, "quddus"], props: ["table"] },
  bench: { at: (g) => ({ [g]: [-0.45, 0, 0.02, 0.28], quddus: [0.45, 0, 0.02, -0.28] }), sit: (g) => [g, "quddus"], props: ["bench"] },
  sofa: { at: (g) => ({ [g]: [-0.45, 0, 0.0, 0.28], quddus: [0.45, 0, 0.0, -0.28] }), sit: (g) => [g, "quddus"], props: ["sofa"] },
  seats: { at: (g) => ({ [g]: [-0.73, 0, 0.02, 0.3], quddus: [0.0, 0, 0.02, -0.3] }), sit: (g) => [g, "quddus"], props: ["seats"] },
  desk: { at: (g) => ({ [g]: [-0.55, 0, -0.35, 0.15], quddus: [0.75, 0, 0.35, -0.55] }), sit: (g) => [g], props: ["desk"] },
  phone: { at: (g) => ({ [g]: [0.1, 0, 0.4, 0.25] }), phone: true },
};

const OUTRO_BACKDROPS = [
  "night city skyline with soft bokeh lights, purple and teal glow, cinematic",
  "sunset over a modern city skyline, warm orange and pink sky, cinematic",
  "starry night sky over a calm city with teal and gold lights, cinematic",
  "abstract glowing world map with flight paths, deep blue and gold, cinematic",
];

function compile(file: string) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const head: Record<string, string> = {};
  const scenes: any[] = [];
  let scene: any = null;
  let guest = "";
  let layout: Layout | null = null;
  let walked = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("==")) {
      const [set, place, backdrop, lay = "stand"] = line.slice(2).split("|").map((x) => x.trim());
      const [layName, ...extra] = lay.split(/\s+/);
      layout = LAYOUTS[layName];
      if (!layout) throw new Error(`${file}: unknown layout ${layName}`);
      const who = (extra.find((x) => x.startsWith("@")) ?? "").slice(1) || guest;
      scene = {
        set,
        place,
        backdrop,
        at: layout.at(who),
        ...(layout.sit ? { sit: layout.sit(who) } : {}),
        props: [...(layout.props ?? []), ...extra.filter((x) => x.startsWith("+")).map((x) => x.slice(1))],
        beats: [],
        _walkIn: layout.walkIn,
        _phone: layout.phone,
      };
      if (layout.phone) delete scene.at.quddus;
      walked = false;
      scenes.push(scene);
      if (scenes.length === 1 && head.hook) {
        const [title, sub] = head.hook.split("|").map((x) => x.trim());
        scene.beats.push({ title, sub, who: guest, act: "wave", shot: "wide", dur: 66 });
      }
      continue;
    }
    if (line.startsWith(">")) {
      const [ic, title, ...rest] = line.slice(1).split("|").map((x) => x.trim());
      const b = scene.beats[scene.beats.length - 1];
      b.card = { icon: ic, title, lines: rest.map((r) => r.replace(/^(\S+)\s+/, "$1|")) };
      if (!b._shot) b.shot = "card";
      continue;
    }
    const m = /^(\w+)\s*(?:\(([^)]*)\))?\s*:\s*(.+)$/.exec(line);
    if (m && !scene) {
      head[m[1]] = m[3].trim();
      if (m[1] === "cast") guest = m[3].split(/[ ,]+/)[0];
      continue;
    }
    if (!m) throw new Error(`${file}: cannot read "${line}"`);
    const [, who, flagStr = "", text] = m;
    const flags = flagStr.split(/[ ,]+/).filter(Boolean);
    const b: any = { who, text };
    const say = sayOf(text);
    if (say !== text) b.say = say;
    else b.say = text;
    if (say === text) delete b.text;
    for (const f of flags) {
      if (ACTS.includes(f)) b.act ??= f;
      if (MOODS.includes(f)) b.mood ??= f;
      if (SHOTS.includes(f)) (b.shot = f), (b._shot = true);
      if (f === "confetti") b.confetti = true;
      if (f === "sit") b.sitAt = who;
    }
    if (b.act === "worried") b.mood ??= "worried";
    if (b.act === "cheer") b.mood ??= "happy";
    if (scene._phone && who === "quddus") b.phone = true;
    if (scene._phone && who !== "quddus") b.act ??= "phone";
    if (scene._walkIn && who === "quddus" && !walked) {
      b.move = { quddus: [0.75, 0, -0.2], [guest]: [-0.75, 0, 0.4] };
      b.act ??= "wave";
      b.shot ??= "two";
      walked = true;
    }
    scene.beats.push(b);
  }
  // automatic shots: wide/two to open a scene, then mostly close-ups with a two-shot every third line
  for (const sc of scenes) {
    let n = 0;
    for (const b of sc.beats) {
      if (!b.shot) b.shot = n === 0 ? "two" : n % 3 === 0 ? "two" : "close";
      if (b.shot === "close" && b.phone && !sc.at[guest]) b.shot = "two";
      delete b._shot;
      n++;
    }
    delete sc._walkIn;
    delete sc._phone;
  }
  // standard ending: Quddus gives the call to action, the guest says goodbye
  const [ctaTitle = 'COMMENT "LINK"', ...ctaLines] = (head.cta ?? 'COMMENT "LINK" | 1f447 Official link in bio').split("|").map((x) => x.trim());
  const id = head.id;
  const seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  scenes.push({
    set: "studio",
    place: head.brand === "fundintech" ? "YOUR TURN" : "YOUR MOVE",
    backdrop: OUTRO_BACKDROPS[seed % OUTRO_BACKDROPS.length],
    at: { [guest]: [-0.6, 0, 0.3, 0.25], quddus: [0.6, 0, 0.3, -0.25] },
    beats: [
      {
        who: "quddus",
        act: "point",
        mood: "happy",
        text: head.ctasay ?? "Want the link? Comment LINK, and check the link in our bio.",
        say: sayOf(head.ctasay ?? "Want the link? Comment LINK, and check the link in our bio."),
        shot: "card",
        card: { icon: "1f517", title: ctaTitle, lines: ctaLines.map((r) => r.replace(/^(\S+)\s+/, "$1|")) },
      },
      { who: guest, act: "wave", mood: "happy", say: sayOf(head.bye ?? "Follow for more stories like this!"), text: head.bye ?? "Follow for more stories like this!", shot: "card", end: true },
    ],
  });
  // every icon must exist in assets/f3d
  const icons = new Set(readdirSync(path.join(root, "assets", "f3d")).map((f) => f.replace(/\.png$/, "")));
  for (const sc of scenes)
    for (const b of sc.beats)
      for (const ic of b.card ? [b.card.icon, ...b.card.lines.map((l: string) => l.split("|")[0])] : [])
        if (!icons.has(ic)) throw new Error(`${file}: missing icon ${ic}`);
  const cast: Record<string, unknown> = { [guest]: castDb[guest], quddus: castDb.quddus };
  if (!castDb[guest]) throw new Error(`${file}: unknown guest ${guest}`);
  const ep = { id, date: head.date, slot: head.slot, series: "story", brand: head.brand ?? "bingebrain", title: head.title, caption: head.caption, opportunity: head.opportunity, cast, scenes };
  writeFileSync(path.join(root, "video", "episodes", `${id}.json`), JSON.stringify(ep, null, 2) + "\n");
  const words = scenes.flatMap((s) => s.beats).reduce((a: number, b: any) => a + (b.text ?? b.say ?? "").split(/\s+/).length, 0);
  console.log(`${id}: ${scenes.length} scenes, ~${Math.round(words / 2.5 + scenes.length * 1.5)}s`);
}

/** data/videos.json: date -> { f: {id, opportunity}, q1, q2 } built from every story episode with a date + slot. */
function schedule() {
  const plan: Record<string, Record<string, unknown>> = {};
  const epDir = path.join(root, "video", "episodes");
  for (const f of readdirSync(epDir).filter((x) => x.endsWith(".json"))) {
    const ep = JSON.parse(readFileSync(path.join(epDir, f), "utf8"));
    if (ep.series !== "story" || !ep.date || !ep.slot) continue;
    plan[ep.date] ??= {};
    if (plan[ep.date][ep.slot]) throw new Error(`two episodes for ${ep.date} ${ep.slot}`);
    plan[ep.date][ep.slot] = ep.slot === "f" ? { id: ep.id, opportunity: ep.opportunity } : ep.id;
  }
  const sorted = Object.fromEntries(Object.entries(plan).sort(([a], [b]) => a.localeCompare(b)));
  const out = {
    _comment: "Generated by video/stories.ts. f = FundInTech afternoon video (@fundntech), q1/q2 = BingeBrain afternoon/night videos (@qomment.chat). Files: media branch <date>-<slot>.mp4",
    ...sorted,
  };
  writeFileSync(path.join(root, "data", "videos.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(`data/videos.json: ${Object.keys(sorted).length} days`);
}

const files = process.argv.slice(2);
const dir = path.join(root, "video", "stories");
for (const f of files.length ? files : readdirSync(dir).filter((x) => x.endsWith(".story")).map((x) => path.join(dir, x))) compile(f);
schedule();
