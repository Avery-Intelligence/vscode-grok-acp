"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const cli_path_1 = require("./cli-path");
(0, node_test_1.describe)("resolveGrokCliPath", () => {
    (0, node_test_1.it)("returns undefined for empty missing configured path without throwing", () => {
        // May return a real path if grok is installed on the machine — still must not throw.
        const result = (0, cli_path_1.resolveGrokCliPath)("");
        strict_1.default.ok(result === undefined || typeof result === "string");
    });
    (0, node_test_1.it)("returns configured path when file exists", () => {
        // process.execPath always exists
        const result = (0, cli_path_1.resolveGrokCliPath)(process.execPath);
        strict_1.default.equal(result, process.execPath);
    });
});
//# sourceMappingURL=cli-path.test.js.map