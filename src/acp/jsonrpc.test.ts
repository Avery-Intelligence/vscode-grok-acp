import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { JsonRpcPeer } from "./jsonrpc";

describe("JsonRpcPeer", () => {
  it("correlates request/response", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const peer = new JsonRpcPeer(stdin, stdout);

    const chunks: string[] = [];
    stdin.on("data", (c: Buffer | string) => chunks.push(String(c)));

    const p = peer.request("ping", { a: 1 }, 2000);
    // wait for write
    await new Promise((r) => setImmediate(r));
    assert.ok(chunks[0]?.includes('"method":"ping"'));
    const sent = JSON.parse(chunks[0]!.trim()) as { id: number };
    stdout.write(
      JSON.stringify({ jsonrpc: "2.0", id: sent.id, result: { ok: true } }) +
        "\n",
    );
    const result = await p;
    assert.deepEqual(result, { ok: true });
    peer.dispose();
  });
});
