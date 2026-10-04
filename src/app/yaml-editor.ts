import "./monaco-environment";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import { configureMonacoYaml } from "monaco-yaml";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js";
import "monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js";
import "../../node_modules/monaco-editor/min/vs/editor/editor.main.css";
import diagramSchema from "../editor/diagram.schema.json";

configureMonacoYaml(monaco, {
  validate: true,
  completion: true,
  schemas: [
    {
      uri: "inmemory://drawthe.net/diagram.schema.json",
      fileMatch: ["inmemory://drawthe.net/diagram.yaml"],
      schema: diagramSchema
    }
  ]
});

export interface YamlDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  lineNumber?: number;
  column?: number;
}

export function createYamlEditor(
  container: HTMLElement,
  onDiagnosticsChanged: (diagnostics: YamlDiagnostic[]) => void,
  /** Markers to drop (e.g. unresolved aliases that a preamble defines). */
  isSuppressed: (message: string) => boolean = () => false
): monaco.editor.IStandaloneCodeEditor {
  const model = monaco.editor.createModel(
    "",
    "yaml",
    monaco.Uri.parse("inmemory://drawthe.net/diagram.yaml")
  );
  monaco.editor.onDidChangeMarkers((resources) => {
    if (resources.some((resource) => resource.toString() === model.uri.toString())) {
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const suppressed = markers.filter((marker) => isSuppressed(marker.message));
      if (suppressed.length > 0) {
        // Re-publish each owner's markers without the suppressed ones; that clears their
        // squiggles and fires this listener again with the filtered set.
        for (const owner of new Set(suppressed.map((marker) => marker.owner))) {
          monaco.editor.setModelMarkers(
            model,
            owner,
            markers.filter((marker) => marker.owner === owner && !isSuppressed(marker.message))
          );
        }
        return;
      }
      onDiagnosticsChanged(
        markers.map((marker) => ({
          severity: marker.severity === monaco.MarkerSeverity.Error ? "error" :
            marker.severity === monaco.MarkerSeverity.Warning ? "warning" : "info",
          message: marker.message,
          lineNumber: marker.startLineNumber,
          column: marker.startColumn
        }))
      );
    }
  });
  queueMicrotask(() => onDiagnosticsChanged([]));
  return monaco.editor.create(container, {
    automaticLayout: true,
    minimap: { enabled: false },
    overviewRulerLanes: 0,
    model
  });
}