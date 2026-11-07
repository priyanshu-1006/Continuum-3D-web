import type { CSSProperties } from "react";
import type { EventId } from "@/lib/events";

const assetRoot = "/continuum/events";

type EventWorldTheme = {
  name: string;
  accent: string;
  accentDark: string;
  highlight: string;
  text: string;
  stone: string;
  trim: string;
  artworkPosition: string;
  artworkAlt: string;
};

const themes: Record<EventId, EventWorldTheme> = {
  "redstone-rush": {
    name: "Redstone Forge",
    accent: "#FF563D",
    accentDark: "#82251D",
    highlight: "#FFD09A",
    text: "#F4EBD8",
    stone: "#242329",
    trim: "redstone",
    artworkPosition: "50% 43%",
    artworkAlt: "A glowing redstone cube suspended above the machinery of a voxel forge",
  },
  promptx: {
    name: "Command Chamber",
    accent: "#39D5FF",
    accentDark: "#164B86",
    highlight: "#C1F4FF",
    text: "#EDF7FF",
    stone: "#202733",
    trim: "promptx",
    artworkPosition: "51% 45%",
    artworkAlt: "A blue command cube floating in a lantern-lit stone library",
  },
  nexathon: {
    name: "Nexus Core",
    accent: "#58F084",
    accentDark: "#145634",
    highlight: "#C8FFD5",
    text: "#E9F9E9",
    stone: "#202A27",
    trim: "nexathon",
    artworkPosition: "50% 44%",
    artworkAlt: "An emerald core glowing in a gold and stone ring above a voxel workshop",
  },
  "neural-nexsus": {
    name: "Neural Observatory",
    accent: "#70E9D4",
    accentDark: "#304263",
    highlight: "#DAC8FF",
    text: "#F0F7FF",
    stone: "#232333",
    trim: "neural-nexsus",
    artworkPosition: "50% 45%",
    artworkAlt: "A luminous network of teal and amethyst voxels in an observatory",
  },
  battleforge: {
    name: "Battleforge Arena",
    accent: "#FFC76F",
    accentDark: "#6D3925",
    highlight: "#FFE8B5",
    text: "#FFF3E4",
    stone: "#242634",
    trim: "battleforge",
    artworkPosition: "50% 47%",
    artworkAlt: "A golden voxel esports arena lit by blue and ember light",
  },
};

export function getEventWorld(id: EventId) {
  const theme = themes[id];
  const directory = `${assetRoot}/${id}`;
  const style = {
    "--event-accent": theme.accent,
    "--event-accent-dark": theme.accentDark,
    "--event-highlight": theme.highlight,
    "--event-text": theme.text,
    "--event-stone": theme.stone,
    "--event-art-position": theme.artworkPosition,
  } as CSSProperties;

  return {
    name: theme.name,
    artworkAlt: theme.artworkAlt,
    style,
    artwork: `${directory}/artwork.webp`,
    banner: `${directory}/banner.png`,
    emblem: `${directory}/emblem.png`,
    trim: `${assetRoot}/shared/frame/wood-trim-${theme.trim}.png`,
    divider: `${assetRoot}/shared/dividers/circuit-${id}.svg`,
  };
}
