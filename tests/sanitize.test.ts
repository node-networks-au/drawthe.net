import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import showdown from "showdown";
import { createHtmlSanitizer, escapeHtml, safeUrl } from "../src/renderer/sanitize";

const sanitize = createHtmlSanitizer(new JSDOM("").window as unknown as Window & typeof globalThis);

test("note HTML loses scripts and event handlers but keeps markdown formatting", () => {
  const markdown = [
    "## Heading",
    "",
    "**bold** and [link](https://example.com)",
    "",
    '<img src="x" onerror="alert(1)">',
    "<script>alert(2)</script>",
    '<a href="javascript:alert(3)">click</a>'
  ].join("\n");
  const html = sanitize(new showdown.Converter().makeHtml(markdown));

  assert.match(html, /<h2[^>]*>Heading<\/h2>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.doesNotMatch(html, /onerror/i);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /javascript:/i);
});

test("note HTML keeps the prettify classes used for code blocks", () => {
  const html = sanitize('<pre class="prettyprint linenums"><code class="yaml">a: 1</code></pre>');
  assert.match(html, /class="prettyprint linenums"/);
});

test("metadata values are escaped before being interpolated into HTML", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('1')">&`),
    "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;"
  );
  assert.equal(escapeHtml(42), "42");
});

test("only http(s), mailto and relative URLs are allowed to be opened or fetched", () => {
  assert.equal(safeUrl("https://example.com/a?b=c"), "https://example.com/a?b=c");
  assert.equal(safeUrl("http://10.0.0.1/device/1"), "http://10.0.0.1/device/1");
  assert.equal(safeUrl("mailto:noc@example.com"), "mailto:noc@example.com");
  assert.equal(safeUrl("/api/devices/r1.json"), "/api/devices/r1.json");
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl(" JavaScript:alert(1)"), undefined);
  assert.equal(safeUrl("data:text/html,<script>alert(1)</script>"), undefined);
  assert.equal(safeUrl("vbscript:msgbox(1)"), undefined);
  assert.equal(safeUrl(""), undefined);
  assert.equal(safeUrl(undefined), undefined);
});
