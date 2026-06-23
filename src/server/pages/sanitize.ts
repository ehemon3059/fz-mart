import sanitizeHtml from "sanitize-html";

/**
 * Allow-list for rich-text page content produced by the Tiptap editor.
 *
 * Content is sanitized on save (server action) so the stored HTML is already
 * safe to render with dangerouslySetInnerHTML. Keep this list in sync with the
 * extensions enabled in the editor (StarterKit + Link).
 */
const PAGE_CONTENT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2",
    "h3",
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
    "code",
    "pre",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  // Only safe URL schemes; blocks javascript: and data: URIs.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // Force external links to be safe.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
  },
};

/** Sanitize editor HTML before persisting. Always run this on the server. */
export function sanitizePageContent(dirty: string): string {
  return sanitizeHtml(dirty, PAGE_CONTENT_OPTIONS);
}
