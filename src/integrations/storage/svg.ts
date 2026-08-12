import sanitizeHtml from "sanitize-html";

// SVG sanitizer for admin-uploaded vector artwork (category images).
//
// An SVG is a document, not a bitmap: served from our own origin it can run
// script, fetch remote resources, or embed foreign content. sharp cannot help
// here — rasterizing it would defeat the point of uploading a vector. So the
// bytes are parsed and rebuilt from an allow-list instead, and only the result
// is ever stored.
//
// The allow-list covers what Illustrator/Figma exports actually contain (see
// the shipped art in /public/categories/*.svg): shapes, paths, groups, gradients
// and a <style> block of CSS classes. Anything outside it — <script>, <foreignObject>,
// <image>, <a>, event handlers, external references — is dropped.

/** Elements an exported illustration legitimately needs. */
const ALLOWED_TAGS = [
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "style",
  "title",
  "desc",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "use",
  "symbol",
  "text",
  "tspan",
];

/** Presentation/geometry attributes, shared by most shape elements. */
const COMMON_ATTRS = [
  "id",
  "class",
  "style",
  "transform",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "opacity",
  "clip-path",
  "clip-rule",
  "mask",
  "color",
  "display",
  "visibility",
];

const SVG_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    svg: [
      ...COMMON_ATTRS,
      "xmlns",
      "viewBox",
      "width",
      "height",
      "x",
      "y",
      "preserveAspectRatio",
      "version",
      "fill-rule",
    ],
    path: [...COMMON_ATTRS, "d"],
    rect: [...COMMON_ATTRS, "x", "y", "width", "height", "rx", "ry"],
    circle: [...COMMON_ATTRS, "cx", "cy", "r"],
    ellipse: [...COMMON_ATTRS, "cx", "cy", "rx", "ry"],
    line: [...COMMON_ATTRS, "x1", "y1", "x2", "y2"],
    polyline: [...COMMON_ATTRS, "points"],
    polygon: [...COMMON_ATTRS, "points"],
    g: COMMON_ATTRS,
    defs: COMMON_ATTRS,
    style: ["type"],
    linearGradient: [
      ...COMMON_ATTRS,
      "x1",
      "y1",
      "x2",
      "y2",
      "gradientUnits",
      "gradientTransform",
      "spreadMethod",
    ],
    radialGradient: [
      ...COMMON_ATTRS,
      "cx",
      "cy",
      "r",
      "fx",
      "fy",
      "gradientUnits",
      "gradientTransform",
      "spreadMethod",
    ],
    stop: [...COMMON_ATTRS, "offset", "stop-color", "stop-opacity"],
    clipPath: [...COMMON_ATTRS, "clipPathUnits"],
    mask: [...COMMON_ATTRS, "maskUnits", "maskContentUnits", "x", "y", "width", "height"],
    pattern: [
      ...COMMON_ATTRS,
      "patternUnits",
      "patternContentUnits",
      "patternTransform",
      "x",
      "y",
      "width",
      "height",
      "viewBox",
    ],
    // No href/xlink:href: `use` may only point at a local id, which sanitize-html
    // cannot verify, so external-reference attacks are removed outright. Symbols
    // defined and referenced in the same file are the casualty; exported artwork
    // rarely relies on them.
    use: [...COMMON_ATTRS, "x", "y", "width", "height"],
    symbol: [...COMMON_ATTRS, "viewBox", "preserveAspectRatio"],
    text: [
      ...COMMON_ATTRS,
      "x",
      "y",
      "dx",
      "dy",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "text-anchor",
      "letter-spacing",
    ],
    tspan: [
      ...COMMON_ATTRS,
      "x",
      "y",
      "dx",
      "dy",
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "text-anchor",
    ],
    title: [],
    desc: [],
  },
  // Drop the contents of anything not allowed, rather than leaving its text
  // behind — a stripped <script> must not leave its body as stray markup.
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  // <style> is allowed on purpose: exporters put every fill colour in it, and
  // dropping it renders the artwork black. The library's blanket XSS warning is
  // acknowledged here because the CSS is filtered separately in sanitizeSvg()
  // and SVG has no equivalent of a style-based script vector once @import,
  // url(), expression() and behavior: are stripped.
  allowVulnerableTags: true,
  allowedSchemes: ["http", "https"],
  allowedSchemesAppliedToAttributes: [],
  parser: {
    // SVG is case-sensitive: linearGradient/clipPath/viewBox must survive as-is.
    lowerCaseTags: false,
    lowerCaseAttributeNames: false,
  },
};

/**
 * CSS constructs that can fetch or execute, removed WHOLE — argument included.
 * Deleting only the keyword would strand its URL as loose text, which reopens
 * the hole it was meant to close (`@import url('x')` → `'x')`).
 *
 * Each alternative consumes through its closing delimiter:
 *   - at-rules (@import/@charset) up to the terminating `;`
 *   - functional values (url(…), expression(…)) up to the matching `)`
 *   - property declarations whose value is a script scheme, up to `;` or `}`
 */
const DANGEROUS_CSS =
  /@(?:import|charset)\b[^;}]*;?|(?:url|expression|image-set|-moz-binding)\s*\([^)]*\)?|[\w-]+\s*:\s*(?:javascript|vbscript|data)\s*:[^;}]*;?|behavior\s*:[^;}]*;?/gi;

/**
 * Parse an uploaded SVG and rebuild it from the allow-list above.
 *
 * Returns the cleaned markup, or null when the bytes are not a usable SVG (no
 * root element survived). Callers store ONLY the returned string — never the
 * original upload.
 */
export function sanitizeSvg(source: string): string | null {
  // Strip the XML prolog, DOCTYPE and comments before parsing: an internal DTD
  // subset is how billion-laughs / XXE payloads arrive, and sanitize-html's HTML
  // parser would otherwise pass them through as text.
  const withoutProlog = source
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Keep the <style> CSS an exporter emits (Illustrator puts every fill there),
  // minus anything that can load or run something. This runs BEFORE parsing:
  // sanitize-html treats <style> content as opaque text and will not filter
  // inside it, so an @import or url() would otherwise reach the output intact.
  const withCleanCss = withoutProlog.replace(
    /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_m, open: string, css: string, close: string) =>
      `${open}${css.replace(DANGEROUS_CSS, "")}${close}`,
  );

  const cleaned = sanitizeHtml(withCleanCss, {
    ...SVG_OPTIONS,
    // <style> keeps its (now-filtered) text; everything else in this list has
    // its contents dropped rather than flattened into stray markup.
    nonTextTags: ["script", "textarea", "option", "noscript"],
    transformTags: {
      style: (tagName) => ({ tagName, attribs: {} }),
    },
  });

  const trimmed = cleaned.trim();
  if (!/^<svg[\s>]/i.test(trimmed)) return null;

  // A sanitized root can lose its namespace if the upload omitted it; browsers
  // need it to render the file when served standalone.
  if (!/\sxmlns\s*=/i.test(trimmed)) {
    return trimmed.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return trimmed;
}
