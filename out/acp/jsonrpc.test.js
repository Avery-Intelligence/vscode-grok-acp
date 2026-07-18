"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_stream_1 = require("node:stream");
const jsonrpc_1 = require("./jsonrpc");
(0, node_test_1.describe)("JsonRpcPeer", () => {
    (0, node_test_1.it)("correlates request/response", async () => {
        const stdin = new node_stream_1.PassThrough();
        const stdout = new node_stream_1.PassThrough();
        const peer = new jsonrpc_1.JsonRpcPeer(stdin, stdout);
        const chunks = [];
        stdin.on("data", (c) => chunks.push(String(c)));
        const p = peer.request("ping", { a: 1 }, 2000);
        // wait for write
        await new Promise((r) => setImmediate(r));
        strict_1.default.ok(chunks[0]?.includes('"method":"ping"'));
        const sent = JSON.parse(chunks[0].trim());
        stdout.write(JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: { ok: true } }) +
            "\n");
        const result = await p;
        strict_1.default.deepEqual(result, { ok: true });
        peer.dispose();
    });
});
//# sourceMappingURL=jsonrpc.test.js.map