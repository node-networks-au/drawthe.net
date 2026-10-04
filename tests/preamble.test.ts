import assert from "node:assert/strict";
import test from "node:test";
import { load } from "js-yaml";
import { createPreamble, editorLine, isPreambleAlias, preambleAnchors, withPreamble } from "../src/app/preamble";

const preambleText = `# House style
houseCanvas: &houseCanvas
  fill: white
houseIcon: &houseIcon {color: navy, iconFamily: cisco2026}
houseRouter: &houseRouter {<<: *houseIcon, icon: router}
# &notAnAnchor in a comment
houseLinks:
  - &houseLink {stroke: navy}
houseNote: &houseNote
  text: "price & conditions"`;

test("anchors are collected from block, flow and sequence positions but not comments or strings", () => {
  assert.deepEqual([...preambleAnchors(preambleText)].sort(), [
    "houseCanvas",
    "houseIcon",
    "houseLink",
    "houseNote",
    "houseRouter"
  ]);
});

test("a diagram using preamble anchors parses once the preamble is prepended", () => {
  const preamble = createPreamble("house.yaml", preambleText);
  const diagram = `diagram: {<<: *houseCanvas, rows: 2}\nicons:\n  r1: {<<: *houseRouter, x: 0, y: 0}\n`;
  assert.throws(() => load(diagram), /unidentified alias/);
  const design = load(withPreamble(preamble, diagram)) as Record<string, any>;
  assert.equal(design.diagram.fill, "white");
  assert.deepEqual(design.icons.r1, { color: "navy", iconFamily: "cisco2026", icon: "router", x: 0, y: 0 });
});

test("without a preamble the diagram text is used unchanged", () => {
  assert.equal(withPreamble(undefined, "a: 1\n"), "a: 1\n");
  assert.equal(editorLine(undefined, 3), 3);
});

test("error lines map back to the editor, and lines inside the preamble map to none", () => {
  const preamble = createPreamble("house.yaml", "a: &a 1\nb: &b 2");
  assert.equal(preamble.lineCount, 2);
  assert.equal(editorLine(preamble, 3), 1);
  assert.equal(editorLine(preamble, 2), undefined);
});

test("only unresolved-alias diagnostics for preamble anchors are suppressed", () => {
  const preamble = createPreamble("house.yaml", preambleText);
  assert.equal(isPreambleAlias(preamble, 'Unresolved alias "*houseRouter"'), true);
  assert.equal(isPreambleAlias(preamble, 'Unresolved alias "*typo"'), false);
  assert.equal(isPreambleAlias(preamble, "Missing property icon"), false);
  assert.equal(isPreambleAlias(undefined, 'Unresolved alias "*houseRouter"'), false);
});

test("a preamble that is not valid YAML is rejected up front", () => {
  assert.throws(() => createPreamble("broken.yaml", "a: [1, 2"));
});
