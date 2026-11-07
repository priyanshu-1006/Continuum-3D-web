export type EventKind = "learn" | "articulate" | "shape" | "build" | "challenge";

export type EventId = "neural-nexsus" | "promptx" | "nexathon" | "redstone-rush" | "battleforge";

export type Event = {
  slug: EventId;
  title: string;
  eyebrow: string;
  category: string;
  chapter: string;
  kind: EventKind;
  accent: string;
  poster: string;
  originalPoster: string;
  description: string;
  shortDescription: string;
  tagline: string;
  dateLabel: string;
  format: string;
  teamLabel: string;
  durationLabel: string;
  venue: string;
  eligibility: string;
  registrationUrl: string | null;
  registrationLabel: string;
  rulebookUrl?: string;
  timelineNote?: string;
  highlights: string[];
  highlightLabels: string[];
  participationNote: string;
};

export const officialLinks = {
  instagram: "https://www.instagram.com/nexsus.mmmut/",
  university: "https://www.mmmut.app/",
  festival: "https://unstop.com/college-fests/continuum-madan-mohan-malaviya-university-of-technology-mmmut-gorakhpur-524153",
} as const;

export const eventKinds: Record<EventKind, string> = {
  learn: "Learn",
  articulate: "Articulate",
  shape: "Shape",
  build: "Build",
  challenge: "Challenge",
};

export const events: Event[] = [
  {
    slug: "neural-nexsus",
    title: "Neural Nexsus",
    eyebrow: "Begin with possibility",
    category: "AI / ML Workshop",
    chapter: "01",
    kind: "learn",
    accent: "#54e6bd",
    poster: "/assets/posters/neural-nexsus.webp",
    originalPoster: "/assets/posters/originals/neural-nexsus.webp",
    description:
      "Step into the ideas behind intelligent systems. Neural Nexsus opens a space to explore artificial intelligence and machine learning, connect the concepts, and start asking better questions about what you could build next.",
    shortDescription: "An AI and machine learning workshop for your next leap forward.",
    tagline: "Curiosity is the first connection.",
    dateLabel: "January 2027",
    format: "Workshop",
    teamLabel: "Participation details to be announced",
    durationLabel: "Timings to be announced",
    venue: "MMMUT, Gorakhpur",
    eligibility: "Eligibility and any prerequisites will be announced with the workshop details.",
    registrationUrl: null,
    registrationLabel: "Link to be announced",
    highlights: [
      "Explore the ideas that connect artificial intelligence, machine learning, and the world around us.",
      "Bring your curiosity, exchange questions, and discover a new direction for your learning.",
      "Meet a community interested in turning emerging technology into something meaningful.",
    ],
    highlightLabels: ["Connect the concepts", "Follow your curiosity", "Find your people"],
    participationNote:
      "The workshop schedule, eligibility, and registration link will be shared through the official Nexsus channels.",
  },
  {
    slug: "promptx",
    title: "PromptX",
    eyebrow: "Make every word work",
    category: "AI Prompt Battle",
    chapter: "02",
    kind: "articulate",
    accent: "#bd80ff",
    poster: "/assets/posters/promptx.webp",
    originalPoster: "/assets/posters/originals/promptx.webp",
    description:
      "A sharp idea deserves a sharper prompt. PromptX brings creativity, clarity, and AI into the same arena. Work solo or with a partner, turn a brief into an intentional prompt, and explore how much a better question can change the result.",
    shortDescription: "A battle of imagination, intention, and the words that bring ideas to life.",
    tagline: "Your words. A world of possibilities.",
    dateLabel: "10 January 2027",
    format: "AI prompt battle",
    teamLabel: "1–2 participants",
    durationLabel: "Schedule on Unstop",
    venue: "MMMUT, Gorakhpur",
    eligibility: "Enter solo or in a team of two. The rulebook requires an independently built submission using the organiser-approved AI platform.",
    registrationUrl:
      "https://unstop.com/competitions/ai-prompt-battle-continuum-mmmut-gorakhpur-1772340",
    registrationLabel: "Register on Unstop",
    rulebookUrl: "https://d8it4huxumps7.cloudfront.net/uploads/attachements/files/9b2da400-a84f-4969-9e53-965df84c2472.pdf",
    timelineNote: "The challenge theme and required features are revealed at the start. Check Unstop for reporting and submission times.",
    highlights: [
      "Translate an imaginative direction into clear, purposeful instructions for AI.",
      "Think about how language, context, and iteration shape a creative result.",
      "Bring your own perspective to a competition where the idea and its expression matter.",
    ],
    highlightLabels: ["Find the idea", "Refine the prompt", "Make your mark"],
    participationNote:
      "Use prompts to create an interactive one-page website from the live brief. Your team’s entry must meet the feature checklist and work when judges try it.",
  },
  {
    slug: "nexathon",
    title: "Nexathon",
    eyebrow: "Give the future a first draft",
    category: "Ideathon",
    chapter: "03",
    kind: "shape",
    accent: "#70dfff",
    poster: "/assets/posters/nexathon.webp",
    originalPoster: "/assets/posters/originals/nexathon.webp",
    description:
      "Every useful invention begins with noticing something that could be better. Nexathon is a place to give that observation a direction: find a problem worth solving, shape an original response, and make a clear case for why it should exist.",
    shortDescription: "Find a problem worth solving. Shape the idea that moves it forward.",
    tagline: "Big changes start with a clear idea.",
    dateLabel: "January 2027",
    format: "Ideathon",
    teamLabel: "1–4 participants",
    durationLabel: "Schedule on Unstop",
    venue: "MMMUT, Gorakhpur",
    eligibility: "Eligible students from MMMUT and other institutions may take part. Submit an original idea and be ready to explain your claims to the jury.",
    registrationUrl:
      "https://unstop.com/competitions/continuum-2027-ideathon-continuum-mmmut-gorakhpur-1772327",
    registrationLabel: "Register on Unstop",
    rulebookUrl: "https://d8it4huxumps7.cloudfront.net/uploads/attachements/files/29c4b7ef-4745-4e44-8542-d8463135e2de.pdf",
    timelineNote: "The online idea submission comes first. Confirm the offline pitch date and reporting time with the organisers through Unstop.",
    highlights: [
      "Look closely at a real problem and the people who experience it.",
      "Turn an initial spark into a focused, understandable proposal.",
      "Bring your team’s perspective together and communicate the value of your idea.",
    ],
    highlightLabels: ["Spot the opportunity", "Shape a solution", "Make the case"],
    participationNote:
      "Submit an idea deck online, then pitch and answer jury questions at MMMUT if shortlisted. A working prototype is optional.",
  },
  {
    slug: "redstone-rush",
    title: "RedStone Rush",
    eyebrow: "Turn the spark into something real",
    category: "Open Innovation Hackathon",
    chapter: "04",
    kind: "build",
    accent: "#ff625a",
    poster: "/assets/posters/redstone-rush.webp",
    originalPoster: "/assets/posters/originals/redstone-rush.webp",
    description:
      "Twelve hours. One shared ambition. RedStone Rush brings teams together for an open innovation hackathon built around making progress: choose a direction, connect your strengths, and turn an idea into something you can put in front of the world.",
    shortDescription: "Twelve hours to connect your team’s ideas and build what comes next.",
    tagline: "Less waiting. More making.",
    dateLabel: "9 January 2027 · finale",
    format: "12-hour open innovation hackathon",
    teamLabel: "3–5 participants",
    durationLabel: "12 hours",
    venue: "MMMUT, Gorakhpur",
    eligibility: "Teams of three to five can propose a software, hardware, or hybrid project. Disclose significant prior work, open-source resources, and AI assistance as the rulebook requires.",
    registrationUrl:
      "https://unstop.com/hackathons/redstone-rush-12-hour-open-innovation-hackathon-continuum-mmmut-gorakhpur-1771949",
    registrationLabel: "Register on Unstop",
    rulebookUrl: "https://d8it4huxumps7.cloudfront.net/uploads/attachements/files/77ab0c55-a413-4a73-b499-9fb26ad0cb42.pdf",
    timelineNote: "Submit your idea online before the deadline shown on Unstop. Shortlisted teams attend the 12-hour build sprint and demo at MMMUT.",
    highlights: [
      "Explore an open innovation direction and decide what your team wants to bring into the world.",
      "Combine different skills, make thoughtful trade-offs, and keep the build moving.",
      "Use a focused twelve-hour window to turn the first idea into a tangible result.",
    ],
    highlightLabels: ["Choose your direction", "Build together", "Make it tangible"],
    participationNote:
      "Submit your idea presentation online. Shortlisted teams build and demonstrate their solution in person at MMMUT during the grand finale.",
  },
  {
    slug: "battleforge",
    title: "Battleforge",
    eyebrow: "Bring your squad. Find your edge.",
    category: "Esports",
    chapter: "05",
    kind: "challenge",
    accent: "#ffc76f",
    poster: "/assets/posters/battleforge.webp",
    originalPoster: "/assets/posters/originals/battleforge.webp",
    description:
      "The next move can change everything. Battleforge brings Free Fire and BGMI into the CONTINUUM arena, where composure, coordination, and a well-timed decision become your strongest tools. Gather your squad and get ready for the challenge.",
    shortDescription: "Free Fire and BGMI. One arena for sharp instincts and stronger squads.",
    tagline: "Every move is a chance to rise.",
    dateLabel: "10 January 2027",
    format: "Free Fire / BGMI",
    teamLabel: "Squad format to be announced",
    durationLabel: "Timings to be announced",
    venue: "MMMUT, Gorakhpur",
    eligibility: "Game formats, squad requirements, and eligibility will be announced by the organisers.",
    registrationUrl: null,
    registrationLabel: "Link to be announced",
    highlights: [
      "Bring your interest in Free Fire or BGMI to the CONTINUUM esports community.",
      "Put team communication, strategic thinking, and split-second decisions in focus.",
      "Follow the official updates for match formats and the path into the arena.",
    ],
    highlightLabels: ["Choose your arena", "Think as a squad", "Watch for the drop"],
    participationNote:
      "The poster announces 10 January 2027 at MMMUT, Gorakhpur. Registration, match timings, and game-specific rules will be shared through official channels.",
  },
];

export const eventBySlug: Record<string, Event> = Object.fromEntries(
  events.map((event) => [event.slug, event]),
);

export function getEvent(slug: string): Event | undefined {
  return Object.prototype.hasOwnProperty.call(eventBySlug, slug) ? eventBySlug[slug] : undefined;
}

export function getAdjacentEvents(slug: string): { previous: Event; next: Event } {
  const index = Math.max(0, events.findIndex((event) => event.slug === slug));
  return {
    previous: events[(index - 1 + events.length) % events.length],
    next: events[(index + 1) % events.length],
  };
}
