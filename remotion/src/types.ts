export type Scene =
  | { type: "hook"; say: string; text: string; sub?: string; icon?: string }
  | { type: "puzzle"; say: string; rows: { items: string[]; equals: string }[]; question: { items: string[] }; note?: string }
  | { type: "countdown"; seconds: number; say?: string }
  | { type: "reveal"; say: string; answer: string; steps?: string[] }
  | { type: "talk"; say: string; who: string; mood?: "happy" | "shock" | "think" | "cry" | "cool"; props?: string[]; place?: string; set?: string }
  | { type: "card"; say: string; title: string; lines: string[]; icon?: string }
  | { type: "outro"; say: string; text: string; next?: string };

export type TimedScene = Scene & {
  from: number; // frame
  dur: number; // frames
  audio?: string; // staticFile path
  /** mouth openness per frame (0..1), from the voice track */
  env?: number[];
  backdrop?: string; // staticFile path
};

export type EpisodeProps = {
  id: string;
  series: "brain" | "comic" | "watch";
  title: string;
  total: number;
  scenes: TimedScene[];
  sfx: { whoosh: string; tick: string; ding: string; pop: string };
  music?: string;
};

export const FPS = 30;
