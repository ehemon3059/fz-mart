/*
 * Cloudflare's published edge ranges, from https://www.cloudflare.com/ips/
 * (https://www.cloudflare.com/ips-v4 and /ips-v6).
 *
 * Embedded rather than fetched: this runs on the request path for every
 * per-IP check, so a network round trip (and its failure modes) is not
 * acceptable here. The list changes rarely — Cloudflare announces changes in
 * advance — but it DOES change, so re-check it periodically. A stale list fails
 * in the safe direction: an unlisted-but-genuine Cloudflare node is rejected
 * and getClientIp returns null, which denies rather than trusting a header.
 *
 * Last synced: 2026-08-30.
 */

const CLOUDFLARE_IPV4 = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

const CLOUDFLARE_IPV6 = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

/** Expand an IPv6 address to its 8 groups, resolving "::". */
function ipv6Groups(ip: string): number[] | null {
  const address = ip.includes(".") ? convertMappedIpv6(ip) : ip;
  if (address === null) return null;

  const halves = address.split("::");
  if (halves.length > 2) return null;

  const parse = (segment: string): number[] | null => {
    if (!segment) return [];
    const out: number[] = [];
    for (const group of segment.split(":")) {
      if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
      out.push(Number.parseInt(group, 16));
    }
    return out;
  };

  const head = parse(halves[0]);
  const tail = halves.length === 2 ? parse(halves[1]) : [];
  if (head === null || tail === null) return null;

  if (halves.length === 2) {
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    return [...head, ...new Array<number>(fill).fill(0), ...tail];
  }
  return head.length === 8 ? head : null;
}

/** "::ffff:1.2.3.4" and friends -> pure-hex form, so one parser handles both. */
function convertMappedIpv6(ip: string): string | null {
  const lastColon = ip.lastIndexOf(":");
  const v4 = ip.slice(lastColon + 1);
  const int = ipv4ToInt(v4);
  if (int === null) return null;
  const high = (int >>> 16).toString(16);
  const low = (int & 0xffff).toString(16);
  return `${ip.slice(0, lastColon + 1)}${high}:${low}`;
}

function inIpv4Cidr(ip: string, cidr: string): boolean {
  const [network, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;

  const ipInt = ipv4ToInt(ip);
  const netInt = ipv4ToInt(network);
  if (ipInt === null || netInt === null) return false;

  // A /0 would shift by 32, which is a no-op in JS (shifts are mod 32), so it
  // is handled separately rather than producing a wrong mask.
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) >>> 0 === (netInt & mask) >>> 0;
}

function inIpv6Cidr(ip: string, cidr: string): boolean {
  const [network, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 128) return false;

  const ipGroups = ipv6Groups(ip);
  const netGroups = ipv6Groups(network);
  if (!ipGroups || !netGroups) return false;

  let remaining = bits;
  for (let i = 0; i < 8 && remaining > 0; i++) {
    const take = Math.min(16, remaining);
    const mask = take === 0 ? 0 : (0xffff << (16 - take)) & 0xffff;
    if ((ipGroups[i] & mask) !== (netGroups[i] & mask)) return false;
    remaining -= take;
  }
  return true;
}

function inCidr(ip: string, cidr: string): boolean {
  const isV6Cidr = cidr.includes(":");
  const isV6Ip = ip.includes(":");
  if (isV6Cidr !== isV6Ip) return false;
  return isV6Cidr ? inIpv6Cidr(ip, cidr) : inIpv4Cidr(ip, cidr);
}

/**
 * Whether `ip` is a published Cloudflare edge address. Applied to the real TCP
 * peer (supplied by nginx), never to a value read out of a client header.
 */
export function isIpInCloudflareRange(ip: string): boolean {
  const ranges = ip.includes(":") ? CLOUDFLARE_IPV6 : CLOUDFLARE_IPV4;
  return ranges.some((cidr) => inCidr(ip, cidr));
}
