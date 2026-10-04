import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildShareUrl,
  decodeShareFragment,
  encodeShareFragment,
  isShareFragment,
  MAX_SHARED_YAML_BYTES
} from "../src/app/share-link";

const example = readFileSync("examples/NTP.yaml", "utf8");

test("a diagram survives an encode/decode round trip, including non-ASCII text", async () => {
  const yaml = `${example}\n# Überprüfung — 路由器 ✓\n`;
  const fragment = await encodeShareFragment(yaml);
  assert.ok(isShareFragment(fragment));
  assert.match(fragment, /^#d=[A-Za-z0-9_-]+$/, "fragment is URL-safe base64 with no padding");
  assert.equal(await decodeShareFragment(fragment), yaml);
});

test("share links are compressed well below the raw YAML size", async () => {
  const fragment = await encodeShareFragment(example);
  assert.ok(fragment.length < example.length / 2, `${fragment.length} vs ${example.length}`);
});

test("buildShareUrl keeps the page path and query and replaces any existing fragment", async () => {
  const url = await buildShareUrl("a: 1\n", { origin: "https://draw.example", pathname: "/", search: "?x=1" });
  assert.match(url, /^https:\/\/draw\.example\/\?x=1#d=/);
  assert.equal(await decodeShareFragment(new URL(url).hash), "a: 1\n");
});

test("non-share fragments are not treated as shared diagrams", () => {
  assert.equal(isShareFragment(""), false);
  assert.equal(isShareFragment("#d="), false);
  assert.equal(isShareFragment("#/abc123"), false);
  assert.equal(isShareFragment("#section"), false);
});

test("malformed, truncated and oversized links are rejected with a readable error", async () => {
  await assert.rejects(decodeShareFragment("#d=!!!not-base64!!!"), /malformed/);
  const fragment = await encodeShareFragment(example);
  await assert.rejects(decodeShareFragment(fragment.slice(0, fragment.length / 2)), /malformed or truncated/);
  const bomb = await encodeShareFragment("a".repeat(MAX_SHARED_YAML_BYTES + 1));
  assert.ok(bomb.length < 4096, "highly compressible payload stays small in the link");
  await assert.rejects(decodeShareFragment(bomb), /larger than 1024 KiB/);
});
