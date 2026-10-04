/**
 * Self-contained share links: the diagram YAML is deflated and base64url-encoded
 * into the URL fragment (`#d=...`). Fragments are never sent to the server, so a
 * shared diagram is not stored or logged anywhere; the link is the diagram.
 */

const FRAGMENT_PREFIX = "#d=";

/** Upper bound on a decoded diagram, so a crafted link cannot inflate into something huge. */
export const MAX_SHARED_YAML_BYTES = 1024 * 1024;

/** Links longer than this get truncated or rejected by some chat and mail clients. */
export const LONG_LINK_WARNING_LENGTH = 8000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

type Bytes = Uint8Array<ArrayBuffer>;

async function readAll(stream: ReadableStream<Bytes>, limit: number): Promise<Bytes> {
  const reader = stream.getReader();
  const chunks: Bytes[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error(`Shared diagram is larger than ${limit / 1024} KiB.`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function streamOf(bytes: Bytes): ReadableStream<Bytes> {
  return new Blob([bytes]).stream();
}

/** Encodes diagram YAML as a URL fragment (including the leading `#`). */
export async function encodeShareFragment(yaml: string): Promise<string> {
  const compressed = streamOf(new TextEncoder().encode(yaml)).pipeThrough(new CompressionStream("deflate-raw"));
  return FRAGMENT_PREFIX + toBase64Url(await readAll(compressed, Number.MAX_SAFE_INTEGER));
}

export function isShareFragment(hash: string): boolean {
  return hash.startsWith(FRAGMENT_PREFIX) && hash.length > FRAGMENT_PREFIX.length;
}

/** Decodes a `#d=...` fragment back to diagram YAML. Throws if it is malformed or too large. */
export async function decodeShareFragment(hash: string): Promise<string> {
  if (!isShareFragment(hash)) {
    throw new Error("Not a shared diagram link.");
  }
  let compressed: Bytes;
  try {
    compressed = fromBase64Url(hash.slice(FRAGMENT_PREFIX.length));
  } catch {
    throw new Error("Shared diagram link is malformed.");
  }
  const inflated = streamOf(compressed).pipeThrough(new DecompressionStream("deflate-raw"));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(await readAll(inflated, MAX_SHARED_YAML_BYTES));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Shared diagram is larger")) {
      throw error;
    }
    throw new Error("Shared diagram link is malformed or truncated.");
  }
}

/** Builds a full share URL for the given page, replacing any existing fragment. */
export async function buildShareUrl(
  yaml: string,
  page: Pick<Location, "origin" | "pathname" | "search">
): Promise<string> {
  return `${page.origin}${page.pathname}${page.search}${await encodeShareFragment(yaml)}`;
}
