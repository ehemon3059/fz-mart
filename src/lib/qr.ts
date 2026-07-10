// Minimal, dependency-free QR Code generator (byte mode, error-correction
// level M), just enough to render a scannable otpauth:// URI for 2FA setup.
// Like lib/totp, we only need one narrow thing, so pulling in a library isn't
// warranted. Implements the QR spec: Reed-Solomon ECC, mask selection, and the
// standard module placement. Output is a self-contained SVG string.

// --- Galois field (GF(256)) tables for Reed-Solomon -------------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  // Built constant-term-first; return highest-degree-first so gen[0] === 1.
  return poly.reverse();
}

function rsEncode(data: number[], ecCount: number): number[] {
  // gen has degree ecCount: gen[0]=1 (leading term) down to gen[ecCount].
  const gen = rsGeneratorPoly(ecCount);
  const res = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    // Subtract factor * gen, skipping the leading gen[0]=1 term.
    for (let i = 0; i < ecCount; i++) {
      res[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return res;
}

// --- Version / capacity tables (ECC level M, byte mode) ----------------------
// [version]: { size, ecPerBlock, group1Blocks, group1Data, group2Blocks, group2Data }
type VersionInfo = {
  version: number;
  ecPerBlock: number;
  blocks: { count: number; dataCount: number }[];
};

// Covers versions 1–10 (byte-mode capacity up to 271 bytes at level M), which
// comfortably fits any otpauth:// URI.
const VERSIONS: VersionInfo[] = [
  { version: 1, ecPerBlock: 10, blocks: [{ count: 1, dataCount: 16 }] },
  { version: 2, ecPerBlock: 16, blocks: [{ count: 1, dataCount: 28 }] },
  { version: 3, ecPerBlock: 26, blocks: [{ count: 1, dataCount: 44 }] },
  { version: 4, ecPerBlock: 18, blocks: [{ count: 2, dataCount: 32 }] },
  { version: 5, ecPerBlock: 24, blocks: [{ count: 2, dataCount: 43 }] },
  {
    version: 6,
    ecPerBlock: 16,
    blocks: [{ count: 4, dataCount: 27 }],
  },
  {
    version: 7,
    ecPerBlock: 18,
    blocks: [{ count: 4, dataCount: 31 }],
  },
  {
    version: 8,
    ecPerBlock: 22,
    blocks: [
      { count: 2, dataCount: 38 },
      { count: 2, dataCount: 39 },
    ],
  },
  {
    version: 9,
    ecPerBlock: 22,
    blocks: [
      { count: 3, dataCount: 36 },
      { count: 2, dataCount: 37 },
    ],
  },
  {
    version: 10,
    ecPerBlock: 26,
    blocks: [
      { count: 4, dataCount: 43 },
      { count: 1, dataCount: 44 },
    ],
  },
];

function totalDataBytes(v: VersionInfo): number {
  return v.blocks.reduce((sum, b) => sum + b.count * b.dataCount, 0);
}

function sizeForVersion(version: number): number {
  return version * 4 + 17;
}

// --- Bit buffer --------------------------------------------------------------
class BitBuffer {
  bits: number[] = [];
  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1);
    }
  }
  get length() {
    return this.bits.length;
  }
}

// --- Alignment pattern centers (versions 1–10) -------------------------------
const ALIGNMENT_CENTERS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// --- Module matrix construction ---------------------------------------------
type Matrix = (number | null)[][];

function buildMatrix(version: number, finalBits: number[]): Matrix {
  const size = sizeForVersion(version);
  const m: Matrix = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );

  const setFn = (r: number, c: number, val: number, isReserved = true) => {
    m[r][c] = val;
    if (isReserved) reserved[r][c] = true;
  };

  // Finder patterns + separators at three corners.
  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const isBorder =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6));
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFn(rr, cc, isBorder || isCenter ? 1 : 0);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0;
    setFn(6, i, v);
    setFn(i, 6, v);
  }

  // Alignment patterns.
  const centers = ALIGNMENT_CENTERS[version];
  for (const r of centers) {
    for (const c of centers) {
      // Skip those overlapping finder patterns.
      if (
        (r <= 8 && c <= 8) ||
        (r <= 8 && c >= size - 9) ||
        (r >= size - 9 && c <= 8)
      )
        continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          setFn(r + dr, c + dc, ring === 1 ? 0 : 1);
        }
      }
    }
  }

  // Dark module.
  setFn(size - 8, 8, 1);

  // Reserve format-info areas (filled after masking).
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) setFn(8, i, 0);
    if (!reserved[i][8]) setFn(i, 8, 0);
  }
  // Version information (18-bit BCH), present for versions >= 7. Two copies:
  // a 6x3 block above the bottom-left finder and its transpose left of the
  // top-right finder. Not masked, so place the real bits here directly.
  if (version >= 7) {
    const vbits = VERSION_BITS[version];
    for (let i = 0; i < 18; i++) {
      const bit = (vbits >> i) & 1;
      const r = Math.floor(i / 3);
      const c = i % 3;
      setFn(size - 11 + c, r, bit); // bottom-left block
      setFn(r, size - 11 + c, bit); // top-right block
    }
  }

  for (let i = 0; i < 8; i++) {
    if (!reserved[8][size - 1 - i]) setFn(8, size - 1 - i, 0);
    if (!reserved[size - 1 - i][8]) setFn(size - 1 - i, 8, 0);
  }

  // Place data bits in zig-zag, skipping reserved modules.
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // skip vertical timing column
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (reserved[row][cc]) continue;
        const bit = bitIdx < finalBits.length ? finalBits[bitIdx] : 0;
        m[row][cc] = bit;
        bitIdx++;
      }
    }
    upward = !upward;
  }

  return applyBestMask(m, reserved);
}

// Version information (18-bit BCH) for versions 7–10; indexed by version.
const VERSION_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
};

// --- Masking -----------------------------------------------------------------
const MASK_FNS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

// EC level M format bits per mask (BCH-encoded, XOR-masked) — precomputed.
const FORMAT_BITS_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
];

function applyBestMask(m: Matrix, reserved: boolean[][]): Matrix {
  const size = m.length;
  let best: Matrix | null = null;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const candidate: Matrix = m.map((row) => row.slice());
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (reserved[r][c]) continue;
        if (MASK_FNS[mask](r, c)) candidate[r][c] = (candidate[r][c] as number) ^ 1;
      }
    }
    placeFormatInfo(candidate, mask);
    const penalty = maskPenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      best = candidate;
    }
  }
  return best!;
}

function placeFormatInfo(m: Matrix, mask: number) {
  const size = m.length;
  const bits = FORMAT_BITS_M[mask];

  // Placement per the QR spec (matching the canonical reference layout): the
  // 15-bit format string is written twice, once around the top-left finder
  // (split vertical/horizontal) and once split across the top-right and
  // bottom-left finders. Bit `i` is the i-th least-significant bit.
  for (let i = 0; i < 15; i++) {
    const mod = (bits >> i) & 1;

    // Vertical copy (down column 8, then bottom-left).
    if (i < 6) m[i][8] = mod;
    else if (i < 8) m[i + 1][8] = mod;
    else m[size - 15 + i][8] = mod;

    // Horizontal copy (along row 8, from right, then top-right).
    if (i < 8) m[8][size - i - 1] = mod;
    else if (i < 9) m[8][15 - i - 1 + 1] = mod;
    else m[8][15 - i - 1] = mod;
  }

  m[size - 8][8] = 1; // dark module
}

function maskPenalty(m: Matrix): number {
  const size = m.length;
  let penalty = 0;
  const at = (r: number, c: number) => (m[r][c] as number) ?? 0;

  // Rule 1: runs of 5+ same-color modules (rows and columns).
  for (let r = 0; r < size; r++) {
    let runColor = -1;
    let runLen = 0;
    for (let c = 0; c < size; c++) {
      const v = at(r, c);
      if (v === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < size; c++) {
    let runColor = -1;
    let runLen = 0;
    for (let r = 0; r < size; r++) {
      const v = at(r, c);
      if (v === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Rule 2: 2x2 blocks of same color.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = at(r, c);
      if (v === at(r, c + 1) && v === at(r + 1, c) && v === at(r + 1, c + 1)) {
        penalty += 3;
      }
    }
  }

  // Rule 3: finder-like patterns (1:1:3:1:1 with 4 light) in rows and columns.
  const pattern1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const pattern2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (arr: number[], start: number, pat: number[]) => {
    for (let k = 0; k < pat.length; k++) if (arr[start + k] !== pat[k]) return false;
    return true;
  };
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) row.push(at(r, c));
    for (let c = 0; c <= size - 11; c++) {
      if (matches(row, c, pattern1) || matches(row, c, pattern2)) penalty += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    const col: number[] = [];
    for (let r = 0; r < size; r++) col.push(at(r, c));
    for (let r = 0; r <= size - 11; r++) {
      if (matches(col, r, pattern1) || matches(col, r, pattern2)) penalty += 40;
    }
  }

  // Rule 4: proportion of dark modules.
  let dark = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (at(r, c) === 1) dark++;
  const ratio = (dark * 100) / (size * size);
  const prev = Math.floor(ratio / 5) * 5;
  penalty += Math.min(Math.abs(prev - 50), Math.abs(prev + 5 - 50)) * 2;

  return penalty;
}

// --- Encoding pipeline -------------------------------------------------------
function encodeData(text: string): { version: VersionInfo; finalBits: number[] } {
  const utf8 = Array.from(new TextEncoder().encode(text));

  // Choose smallest version that fits (byte mode: 4-bit mode indicator +
  // count field + data). Count field is 8 bits for v1-9, 16 bits for v10+.
  const version = VERSIONS.find((v) => {
    const countBits = v.version <= 9 ? 8 : 16;
    const capacityBits = totalDataBytes(v) * 8;
    return 4 + countBits + utf8.length * 8 <= capacityBits;
  });
  if (!version) throw new Error("QR: data too long for supported versions");

  const countBits = version.version <= 9 ? 8 : 16;
  const bb = new BitBuffer();
  bb.put(0b0100, 4); // byte mode
  bb.put(utf8.length, countBits);
  for (const byte of utf8) bb.put(byte, 8);

  const totalData = totalDataBytes(version);
  const capacityBits = totalData * 8;

  // Terminator (up to 4 bits) then pad to a byte boundary.
  const term = Math.min(4, capacityBits - bb.length);
  bb.put(0, term);
  while (bb.length % 8 !== 0) bb.bits.push(0);

  // Pad bytes.
  const dataBytes: number[] = [];
  for (let i = 0; i < bb.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bb.bits[i + j];
    dataBytes.push(byte);
  }
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (dataBytes.length < totalData) dataBytes.push(padBytes[pi++ % 2]);

  // Split into blocks, compute EC per block, then interleave.
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;
  for (const group of version.blocks) {
    for (let b = 0; b < group.count; b++) {
      const data = dataBytes.slice(offset, offset + group.dataCount);
      offset += group.dataCount;
      blocks.push({ data, ec: rsEncode(data, version.ecPerBlock) });
    }
  }

  const maxData = Math.max(...blocks.map((b) => b.data.length));
  const finalBytes: number[] = [];
  for (let i = 0; i < maxData; i++) {
    for (const blk of blocks) if (i < blk.data.length) finalBytes.push(blk.data[i]);
  }
  for (let i = 0; i < version.ecPerBlock; i++) {
    for (const blk of blocks) finalBytes.push(blk.ec[i]);
  }

  const finalBits: number[] = [];
  for (const byte of finalBytes)
    for (let i = 7; i >= 0; i--) finalBits.push((byte >> i) & 1);

  return { version, finalBits };
}

/**
 * Render `text` as a QR code and return a self-contained SVG string.
 * Suitable for embedding directly or as a data: URI.
 */
export function qrToSvg(text: string, opts: { scale?: number; margin?: number } = {}): string {
  const scale = opts.scale ?? 4;
  const margin = opts.margin ?? 4;
  const { version, finalBits } = encodeData(text);
  const matrix = buildMatrix(version.version, finalBits);
  const size = matrix.length;
  const dim = (size + margin * 2) * scale;

  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + margin) * scale;
        const y = (r + margin) * scale;
        path += `M${x} ${y}h${scale}v${scale}h-${scale}z`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" ` +
    `viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`
  );
}
