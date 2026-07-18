"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonRpcPeer = exports.resolveGrokCliPath = exports.createGrokAcpSession = void 0;
var session_1 = require("./acp/session");
Object.defineProperty(exports, "createGrokAcpSession", { enumerable: true, get: function () { return session_1.createGrokAcpSession; } });
var cli_path_1 = require("./cli-path");
Object.defineProperty(exports, "resolveGrokCliPath", { enumerable: true, get: function () { return cli_path_1.resolveGrokCliPath; } });
var jsonrpc_1 = require("./acp/jsonrpc");
Object.defineProperty(exports, "JsonRpcPeer", { enumerable: true, get: function () { return jsonrpc_1.JsonRpcPeer; } });
//# sourceMappingURL=index.js.map