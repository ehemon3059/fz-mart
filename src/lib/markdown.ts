/**
 * Tiny Markdown → HTML renderer for admin-authored product descriptions.
 *
 * Deliberately not a full CommonMark implementation. It covers exactly the
 * subset the product description editor can produce (headings, bold/italic,
 * bullet lists, pipe tables, dividers, links, paragraphs) and nothing else.
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
      !isTableRow(lines[i])
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
