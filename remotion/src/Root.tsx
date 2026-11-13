import { Composition } from "remotion";
import { Episode } from "./Episode";
import { Story } from "./story/Story";
import type { StoryProps } from "./story/types";
import { FPS, type EpisodeProps } from "./types";

const placeholder: EpisodeProps = {
  id: "preview",
  series: "brain",
  title: "Preview",
  total: 90,
  scenes: [{ type: "hook", text: "PREVIEW", say: "Preview", from: 0, dur: 90 }],
  sfx: { whoosh: "sfx/whoosh.wav", tick: "sfx/tick.wav", ding: "sfx/ding.wav", pop: "sfx/pop.wav" },
};

const storyPlaceholder: StoryProps = { id: "preview", title: "Preview", total: 90, cast: {}, scenes: [], beats: [], sfx: { whoosh: "sfx/whoosh.wav", pop: "sfx/pop.wav", ding: "sfx/ding.wav" } };

export const Root: React.FC = () => (
  <>
  <Composition
    id="Story"
    component={Story}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={90}
    defaultProps={storyPlaceholder}
    calculateMetadata={({ props }) => ({ durationInFrames: props.total })}
  />
  <Composition
    id="Episode"
    component={Episode}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={90}
    defaultProps={placeholder}
    calculateMetadata={({ props }) => ({ durationInFrames: props.total })}
  />
  </>
);
