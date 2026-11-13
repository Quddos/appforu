export type Act = "idle" | "talk" | "wave" | "cheer" | "facepalm" | "think" | "shrug" | "point" | "phone" | "type" | "worried" | "thumbs";
export type Mood = "happy" | "worried" | "think" | "shock" | "cool";
export type Shot = "wide" | "two" | "close" | "card";
/** [x, y, z, rotY?] — rotY omitted = turn towards the centre */
export type Place = [number, number, number, number?];

export type Card = { icon: string; title: string; lines: string[] };

export type Beat = {
  who: string;
  say?: string;
  text?: string;
  act?: Act;
  mood?: Mood;
  shot?: Shot;
  card?: Card;
  move?: Record<string, Place>;
  sitAt?: string;
  phone?: boolean;
  title?: string;
  sub?: string;
  confetti?: boolean;
  end?: boolean;
  dur?: number;
};

export type StoryScene = {
  set: "campus" | "cafe" | "room" | "studio" | "office" | "park" | "airport" | "street" | "library" | "living";
  place: string;
  backdrop?: string;
  at: Record<string, Place>;
  sit?: string[];
  props?: string[];
  beats: Beat[];
};

export type CastMember = {
  name: string;
  color: string;
  /** "male" / "female" or a Piper voice id such as en_US-joe-medium */
  voice: string;
  look: import("./Stickman").Look;
  glasses?: boolean;
  hair?: string;
  speed?: number;
};

export type TimedBeat = Beat & {
  scene: number;
  from: number;
  dur: number;
  audio?: string;
  env?: number[];
  /** frames of speech (for caption progress) */
  speech: number;
};

export type StoryProps = {
  id: string;
  brand?: "bingebrain" | "fundintech";
  title: string;
  total: number;
  cast: Record<string, CastMember>;
  scenes: (Omit<StoryScene, "beats"> & { backdropFile?: string })[];
  beats: TimedBeat[];
  sfx: { whoosh: string; pop: string; ding: string };
  music?: string;
};
