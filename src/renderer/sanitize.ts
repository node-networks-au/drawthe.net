import createDOMPurify, { type WindowLike } from "dompurify";

/**
 * Helpers for rendering diagram-supplied text into the page. Diagram YAML is
 * untrusted input (it can be pasted, loaded from a URL or shared), so anything
 * that reaches an HTML sink must be sanitized or escaped first.
 */

type HtmlSanitizer = (html: string) => string;

let browserSanitizer: HtmlSanitizer | undefined;

/** Builds a sanitizer bound to the given window (a jsdom window in tests). */
export function createHtmlSanitizer(window: WindowLike): HtmlSanitizer {
  const purify = createDOMPurify(window);
  return (html) => purify.sanitize(html, { USE_PROFILES: { html: true } });
}

/** Strips scripts, event handlers and other active content from rendered note HTML. */
export function sanitizeHtml(html: string): string {
  browserSanitizer ??= createHtmlSanitizer(globalThis.window);
  return browserSanitizer(html);
}

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Escapes a value for interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

const safeUrlProtocols = new Set(["http:", "https:", "mailto:"]);

/**
 * Returns the URL if it is http(s), mailto or relative, otherwise undefined.
 * Rejects `javascript:`, `data:` and similar schemes that would run code when opened.
 */
export function safeUrl(value: unknown, base = "https://example.invalid/"): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  try {
    return safeUrlProtocols.has(new URL(value.trim(), base).protocol) ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}
