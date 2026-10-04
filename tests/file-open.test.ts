import assert from "node:assert/strict";
import test from "node:test";
import { isYamlFileName, MAX_YAML_FILE_BYTES, readYamlFile } from "../src/app/file-open";

test("only .yaml and .yml files are accepted, case-insensitively", () => {
  assert.equal(isYamlFileName("network.yaml"), true);
  assert.equal(isYamlFileName("NETWORK.YML"), true);
  assert.equal(isYamlFileName("my diagram.v2.yaml"), true);
  assert.equal(isYamlFileName("network.yaml.txt"), false);
  assert.equal(isYamlFileName("network.json"), false);
  assert.equal(isYamlFileName("yaml"), false);
});

test("a YAML file is read as text with its name", async () => {
  const file = new File(["diagram:\n  rows: 2\n"], "pop.yaml", { type: "application/yaml" });
  assert.deepEqual(await readYamlFile(file), { name: "pop.yaml", text: "diagram:\n  rows: 2\n" });
});

test("non-YAML and oversized files are rejected with a readable message", async () => {
  await assert.rejects(readYamlFile(new File(["{}"], "pop.json")), /not a YAML file/);
  const huge = { name: "huge.yaml", size: MAX_YAML_FILE_BYTES + 1, text: async () => "" };
  await assert.rejects(readYamlFile(huge), /larger than 5 MiB/);
});
