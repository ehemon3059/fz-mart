import type { SVGProps } from "react";

/** Paths for each named icon. Multi-path icons use " M" as a segment separator. */
const PATHS: Record<string, string> = {
  search:   "M11 11 21 21 M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z",
  edit:     "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
  externalLink: "M14 4h6v6 M20 4 11 13 M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6",
  arrowRight:   "M5 12h14 M13 6l6 6-6 6",
  chevronRight: "M9 6l6 6-6 6",
  arrowLeft:    "M19 12H5 M11 18l-6-6 6-6",
  file:     "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5",
  eye:      "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  bold:     "M7 5h6a3.5 3.5 0 0 1 0 7H7z M7 12h7a3.5 3.5 0 0 1 0 7H7z",
  italic:   "M19 4h-9 M14 20H5 M15 4 9 20",
  ul:       "M8 6h12 M8 12h12 M8 18h12 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01",
  ol:       "M10 6h11 M10 12h11 M10 18h11 M4 6h1v4 M4 10h2 M6 16a1.5 1.5 0 0 0-3 0 M3 19l2.5-1.5",
  link:     "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1 M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1",
  quote:    "M7 7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v3a3 3 0 0 1-3 3 M20 7h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v3a3 3 0 0 1-3 3",
  save:     "M5 3h11l3 3v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M7 3v6h8V3 M8 21v-6h8v6",
  check:    "M5 12l5 5 9-11",
  home:     "M3 11l9-7 9 7 M5 10v10h14V10",
  grid:     "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  box:      "M3 7l9-4 9 4-9 4-9-4Z M3 7v10l9 4 9-4V7 M12 11v10",
  cart:     "M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.5a1 1 0 0 0 1-.8L20 8H6 M9 20h.01 M17 20h.01",
  tag:      "M3 11V4a1 1 0 0 1 1-1h7l9 9-8 8-9-9Z M7.5 7.5h.01",
  users:    "M16 19c0-3-2.5-5-6-5s-6 2-6 5 M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M18 11a3 3 0 1 0-2.5-1.3 M22 18c0-2-1.4-3.4-3.5-3.8",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 18.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 13H3.9a2 2 0 0 1 0-4H4a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4V3.9a2 2 0 0 1 4 0V4a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 20 11h.1a2 2 0 0 1 0 4H20Z",
  pencil: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
  trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
  plus: "M12 5v14 M5 12h14",
  x: "M18 6 6 18 M6 6l12 12",
  warn: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z M12 9v4 M12 17h.01",
  chevronDown: "M6 9l6 6 6-6",
  star: "M12 2l3.1 6.3 6.9.9-5 4.9 1.2 6.9L12 17.8l-6.2 3.2 1.2-6.9-5-4.9 6.9-.9Z",
  image: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M21 15l-5-5L5 21",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 16v-4 M12 8h.01",
  shield: "M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6Z M9 12l2 2 4-4",
  ban: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M5 5l14 14",
  minus: "M5 12h14",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M2 12h20 M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10Z",
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof PATHS;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.7, className, ...rest }: IconProps) {
  const d = PATHS[name];
  if (!d) return null;
  const segments = d.split(" M");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {segments.map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

export type IconName = keyof typeof PATHS;
