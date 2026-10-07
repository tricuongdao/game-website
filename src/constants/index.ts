import { FaDiscord, FaTwitch, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

export const NAV_ITEMS = [
  { label: "TRAILER", href: "#hero" },
  { label: "About", href: "#about" },
  { label: "Agents", href: "#nexus" },
  { label: "Story", href: "#story" },
  { label: "Contact", href: "#contact" },
] as const;

export const LINKS = {
  sourceCode: "https://github.com/tricuongdao/game-website",
} as const;

export const SOCIAL_LINKS = [
  {
    href: "https://discord.com/invite/valorant",
    icon: FaDiscord,
  },
  {
    href: "https://x.com/VALORANT",
    icon: FaXTwitter,
  },
  {
    href: "https://www.youtube.com/@VALORANT",
    icon: FaYoutube,
  },
  {
    href: "https://www.twitch.tv/valorant",
    icon: FaTwitch,
  },
] as const;

/**
 * Local, self-hosted VALORANT media.
 *
 * Sourced from Riot Games' own public channels (playvalorant.com asset kit and
 * media pages), then re-encoded to H.264 MP4 so every browser can autoplay them
 * and the site ships no third-party hotlinks.
 */
export const VIDEO_LINKS = {
  // hero carousel - cinematic + gameplay reels
  hero1: "/videos/hero-1.mp4",
  hero2: "/videos/hero-2.mp4",
  hero3: "/videos/hero-3.mp4",
  hero4: "/videos/hero-4.mp4",

  // bento grid
  feature1: "/videos/feature-1.mp4",
  feature2: "/videos/feature-2.mp4",
  feature3: "/videos/feature-3.mp4",
  feature4: "/videos/feature-4.mp4",
  feature5: "/videos/feature-5.mp4",
} as const;

/** Stills used across the About / Story / Contact sections. */
export const IMAGE_LINKS = {
  logo: "/img/logo.png",
  about: "/img/about.webp",
  story: "/img/story.webp",
  contactAgent: "/img/contact-1.webp",
  contactSupport: "/img/contact-2.webp",
  agentPortrait: "/img/agent-portrait.webp",
  agentSupport: "/img/agent-support.webp",
} as const;
