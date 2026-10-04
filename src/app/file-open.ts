/**
 * Opens a local YAML file into the editor, either by dropping it anywhere on the
 * page or through the toolbar's Open button. Files are read in the browser and
 * never uploaded.
 */

export const MAX_YAML_FILE_BYTES = 5 * 1024 * 1024;

const yamlExtension = /\.ya?ml$/i;

export interface OpenedFile {
  name: string;
  text: string;
}

export function isYamlFileName(name: string): boolean {
  return yamlExtension.test(name.trim());
}

/** Reads a dropped or selected file, rejecting anything that is not a reasonably sized YAML file. */
export async function readYamlFile(file: Pick<File, "name" | "size" | "text">): Promise<OpenedFile> {
  if (!isYamlFileName(file.name)) {
    throw new Error(`"${file.name}" is not a YAML file (expected .yaml or .yml).`);
  }
  if (file.size > MAX_YAML_FILE_BYTES) {
    throw new Error(`"${file.name}" is larger than ${MAX_YAML_FILE_BYTES / 1024 / 1024} MiB.`);
  }
  return { name: file.name, text: await file.text() };
}

export interface FileOpenOptions {
  /** Toolbar button that opens the file picker. */
  openButton: HTMLElement | null;
  /** Element that receives the `is-file-dragover` class while a file is dragged over the page. */
  highlightTarget: HTMLElement;
  onOpen: (file: OpenedFile) => void;
  onError: (message: string) => void;
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function installFileOpen({ openButton, highlightTarget, onOpen, onError }: FileOpenOptions): void {
  const open = (file: File | undefined): void => {
    if (!file) {
      return;
    }
    readYamlFile(file)
      .then(onOpen)
      .catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)));
  };

  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = ".yaml,.yml";
  picker.hidden = true;
  picker.addEventListener("change", () => {
    open(picker.files?.[0]);
    picker.value = "";
  });
  document.body.appendChild(picker);
  openButton?.addEventListener("click", () => picker.click());

  // Capture-phase window listeners run before Monaco's own drop handling and stop the
  // browser from navigating away to the dropped file. Text drags are left alone.
  let depth = 0;
  const setHighlight = (on: boolean): void => {
    highlightTarget.classList.toggle("is-file-dragover", on);
  };
  window.addEventListener(
    "dragenter",
    (event) => {
      if (hasFiles(event)) {
        depth += 1;
        setHighlight(true);
      }
    },
    true
  );
  window.addEventListener(
    "dragleave",
    (event) => {
      if (hasFiles(event)) {
        depth = Math.max(0, depth - 1);
        setHighlight(depth > 0);
      }
    },
    true
  );
  window.addEventListener(
    "dragover",
    (event) => {
      if (hasFiles(event)) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
      }
    },
    true
  );
  window.addEventListener(
    "drop",
    (event) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      depth = 0;
      setHighlight(false);
      open(event.dataTransfer?.files[0]);
    },
    true
  );
}
