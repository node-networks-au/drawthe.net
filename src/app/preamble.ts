import { load } from "js-yaml";

/**
 * Optional site-wide preamble: a YAML file of shared anchors (house-style icon,
 * group and connection defaults) that is prepended to the editor text before
 * rendering, so diagrams can use `<<: *houseRouter` without defining it.
 *
 * A deployment enables it with `<meta name="drawthe-preamble" content="path/to/preamble.yaml">`.
 * The preamble should only define anchors under its own top-level keys; top-level
 * keys such as `diagram:` or `icons:` would collide with the diagram's own.
 */

export interface Preamble {
  url: string;
  text: string;
  /** Anchor names defined by the preamble (without the leading `&`). */
  anchors: Set<string>;
  /** Number of lines the preamble occupies in front of the diagram text. */
  lineCount: number;
}

export const PREAMBLE_META_NAME = "drawthe-preamble";

const anchorPattern = /(?:^|[\s[{,:])&([^\s,[\]{}]+)/g;

/** Lists the anchors a YAML text defines, ignoring comment lines. */
export function preambleAnchors(text: string): Set<string> {
  const anchors = new Set<string>();
  for (const line of text.split("\n")) {
    const content = line.replace(/(^|\s)#.*$/, "");
    for (const match of content.matchAll(anchorPattern)) {
      anchors.add(match[1]);
    }
  }
  return anchors;
}

export function createPreamble(url: string, text: string): Preamble {
  const normalized = text.endsWith("\n") ? text : `${text}\n`;
  // Fail fast on a broken preamble rather than reporting confusing errors in every diagram.
  load(normalized);
  return {
    url,
    text: normalized,
    anchors: preambleAnchors(normalized),
    lineCount: normalized.split("\n").length - 1
  };
}

/** Prepends the preamble (if any) to the diagram text for parsing. */
export function withPreamble(preamble: Preamble | undefined, text: string): string {
  return preamble ? preamble.text + text : text;
}

/**
 * Maps a 1-based line in the combined text back to the editor. Returns undefined
 * when the line falls inside the preamble itself.
 */
export function editorLine(preamble: Preamble | undefined, combinedLine: number): number | undefined {
  const line = combinedLine - (preamble?.lineCount ?? 0);
  return line >= 1 ? line : undefined;
}

const unresolvedAlias = /^Unresolved alias "\*([^"]+)"$/;

/** True for an editor "Unresolved alias" diagnostic that the preamble satisfies. */
export function isPreambleAlias(preamble: Preamble | undefined, message: string): boolean {
  const name = unresolvedAlias.exec(message)?.[1];
  return name !== undefined && preamble !== undefined && preamble.anchors.has(name);
}

/** Loads the preamble named by the page's `drawthe-preamble` meta tag, if there is one. */
export async function loadPreamble(doc: Document = document): Promise<Preamble | undefined> {
  const url = doc.querySelector<HTMLMetaElement>(`meta[name="${PREAMBLE_META_NAME}"]`)?.content.trim();
  if (!url) {
    return undefined;
  }
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Preamble ${url} could not be loaded (HTTP ${response.status}).`);
  }
  return createPreamble(url, await response.text());
}
