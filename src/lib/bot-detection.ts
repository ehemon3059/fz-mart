// Cheap user-agent bot heuristic for funnel-event filtering. Not a security
// control — just enough to keep crawlers, uptime monitors, and headless tools
// from inflating the storefront conversion funnel. Intentionally conservative:
// a false negative (a bot counted as human) only adds noise; a false positive
// (a human dropped) loses a real data point, so we only match obvious tokens.

const BOT_UA_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|headless|phantomjs|puppeteer|playwright|lighthouse|pingdom|uptimerobot|curl|wget|python-requests|axios|go-http|monitor|preview|scrapy|semrush|ahrefs|dataprovider|censys/i;

/** True when the user-agent looks like an automated client (or is empty). */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // real browsers always send a UA; absent = script
  return BOT_UA_RE.test(userAgent);
}
