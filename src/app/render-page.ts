import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/app.css";
import "../styles/notes.css";
import { load } from "js-yaml";
import { draw } from "../renderer/draw";
import { createBrowserIconLoader } from "../renderer/icon-loader-browser";
import { createBrowserRenderTarget } from "../renderer/render-target-browser";
import type { DiagramDocument } from "../renderer/types";
import { decodeShareFragment, isShareFragment } from "./share-link";

const svgContainer = document.getElementById("svg") as HTMLElement;
const target = createBrowserRenderTarget(svgContainer);
const iconLoader = createBrowserIconLoader();

const params = new URLSearchParams(window.location.search);
const docParam = params.get("doc");

let source: Promise<string>;
if (docParam) {
  source = fetch(`./examples/${docParam}.yaml`).then((response) => response.text());
} else if (isShareFragment(window.location.hash)) {
  source = decodeShareFragment(window.location.hash);
} else {
  throw new Error("Missing diagram: pass ?doc=<example> or a #d= share fragment");
}

source.then((text) => {
  const design = (load(text) || {}) as DiagramDocument;
  draw(design, { target, iconLoader });
  if (design.title?.text) {
    document.title = `drawthe.net: ${design.title.text}`;
  }
});
