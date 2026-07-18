import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveGrokCliPath } from "./cli-path";

describe("resolveGrokCliPath", () => {
  it("returns undefined for empty missing configured path without throwing", () => {
    // May return a real path if grok is installed on the machine — still must not throw.
    const result = resolveGrokCliPath("");
    assert.ok(result === undefined || typeof result === "string");
  });

  it("returns configured path when file exists", () => {
    // process.execPath always exists
    const result = resolveGrokCliPath(process.execPath);
    assert.equal(result, process.execPath);
  });
});
