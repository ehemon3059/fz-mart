/**
 * Tiny Markdown → HTML renderer for admin-authored product descriptions.
 *
 * Deliberately not a full CommonMark implementation. It covers exactly the
 * subset the product description editor can produce (headings, bold/italic,
 * bullet lists, pipe tables, dividers, links, paragraphs, spec grids) and
 * nothing else.
 *
 * Safety: the source is escaped *first*, so any raw HTML an admin pastes is
 * shown as literal text rather than executed. That keeps the output safe to
 * feed to `dangerouslySetInnerHTML` without pulling a sanitizer into the
 * client bundle, and lets the same function run on the server (storefront)
 * and in the browser (admin live preview).
 */

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Inline spans: links, bold, italic, `code`. Input must already be escaped. */
function inline(text: string): string {
  return (
    text
      // [label](https://…) — only http(s) and mailto survive.
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (_m, label, href) => {
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
  );
}

/** Blockquote marker. Matched *after* escaping, so `>` is already `&gt;`. */
const BLOCKQUOTE_RE = /^\s*(?:&gt;|>)\s?/;

const isTableRow = (l: string) => l.trim().startsWith("|") && l.trim().endsWith("|");
const isTableDivider = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l) && l.includes("-");
const splitCells = (l: string) =>
  l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/* ─────────── spec grid ─────────── */
/**
 * `::specs` … `::` — the marketplace-style "Product Details" block: label above
 * value, two per row, hairline separated. A pipe table gets heavy fast once a
 * garment carries twenty attributes, and its `Attribute | Detail` header adds
 * nothing the labels don't already say.
 *
 * Body lines are `Label: Value`. A block where no line has a colon is read as
 * alternating label / value lines instead, so an admin can paste a spec list
 * copied off a marketplace page straight in.
 */
const SPEC_OPEN_RE = /^\s*::+\s*(?:specs?|details|product[\s-]?details)\s*$/i;
const SPEC_CLOSE_RE = /^\s*::+\s*$/;

/** Tolerate list markers and bold wrapping around a pasted label. */
const cleanCell = (s: string) =>
  s
    .trim()
    .replace(/^[*-]\s+/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .trim();

function specPairs(lines: string[]): [string, string][] {
  const rows = lines.map((l) => l.trim()).filter(Boolean);
  if (!rows.length) return [];

  // `Label: Value` — the authored form.
  if (rows.some((l) => l.includes(":"))) {
    return rows.map((l): [string, string] => {
      const at = l.indexOf(":");
      return at === -1 ? [cleanCell(l), ""] : [cleanCell(l.slice(0, at)), cleanCell(l.slice(at + 1))];
    });
  }

  // Colon-free block — label and value on their own lines, as pasted.
  const pairs: [string, string][] = [];
  for (let i = 0; i < rows.length; i += 2) pairs.push([cleanCell(rows[i]), cleanCell(rows[i + 1] ?? "")]);
  return pairs;
}

export function renderMarkdown(src: string): string {
  if (!src?.trim()) return "";

  const lines = escapeHtml(src.replace(/\r\n/g, "\n")).split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — nothing to emit, blocks are closed as they are built.
    if (!line.trim()) {
      i++;
      continue;
    }

    // Divider
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push("<hr />");
      i++;
      continue;
    }

    // Heading (## / ###, and #### as a small heading)
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(Math.max(heading[1].length, 2), 4); // h1 collapses to h2 — the page owns the h1
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // Spec grid — `::specs` … `::`
    if (SPEC_OPEN_RE.test(line)) {
      i++;
      const body: string[] = [];
      while (i < lines.length && !SPEC_CLOSE_RE.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume the closing `::`
      const pairs = specPairs(body).filter(([label, value]) => label || value);
      if (pairs.length) {
        const items = pairs
          .map(
            ([label, value]) =>
              `<div class="fz-spec"><dt>${inline(label)}</dt><dd>${inline(value) || "&mdash;"}</dd></div>`,
          )
          .join("");
        // `not-prose` keeps Tailwind Typography's dl/dt/dd rules off the grid —
        // the storefront and the admin preview both render it inside `.prose`.
        out.push(`<dl class="fz-specs not-prose">${items}</dl>`);
      }
      continue;
    }

    // Table — a header row followed by a |---|---| divider
    if (isTableRow(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      const head = splitCells(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        body.push(splitCells(lines[i]));
        i++;
      }
      const th = head.map((c) => `<th>${inline(c)}</th>`).join("");
      const rows = body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
        .join("");
      // Wrapped so a wide spec table scrolls itself instead of the page.
      out.push(
        `<div style="overflow-x:auto"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`,
      );
      continue;
    }

    // Lists — `* `, `- ` (bullet) or `1. ` (ordered). No nesting.
    const bullet = /^\s*[*-]\s+(.*)$/;
    const ordered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || ordered.test(line)) {
      const isOrdered = ordered.test(line);
      const re = isOrdered ? ordered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(`<li>${inline(re.exec(lines[i])![1].trim())}</li>`);
        i++;
      }
      const tag = isOrdered ? "ol" : "ul";
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    // Blockquote
    if (BLOCKQUOTE_RE.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i])) {
        parts.push(lines[i].replace(BLOCKQUOTE_RE, ""));
        i++;
      }
      out.push(`<blockquote><p>${inline(parts.join(" "))}</p></blockquote>`);
      continue;
    }

    // Paragraph — consecutive plain lines join with <br /> (matches the
    // line-per-line way descriptions are typed).
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i]) &&
      !bullet.test(lines[i]) &&
      !ordered.test(lines[i]) &&
      !BLOCKQUOTE_RE.test(lines[i]) &&
      !isTableRow(lines[i]) &&
      !SPEC_OPEN_RE.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) out.push(`<p>${inline(para.join("<br />"))}</p>`);
  }

  return out.join("\n");
}

/** Markdown → plain text, for meta descriptions / JSON-LD / previews. */
export function markdownToPlainText(src: string): string {
  return src
    .replace(/^\s*::+\s*(?:specs?|details|product[\s-]?details)?\s*$/gim, "") // spec-grid fences
    .replace(/^\s*\|[\s:|-]+\|\s*$/gm, "") // table divider rows
    .replace(/^\s*(---+|\*\*\*+|___+)\s*$/gm, "") // section dividers
    .replace(/\|/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*-]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
