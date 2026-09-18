import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  DEFAULT_HTTP_HOST,
  DEFAULT_HTTP_PORT,
  MAX_HTTP_BODY_BYTES,
  MCP_HTTP_PATH,
} from "./constants.js";
import { createServer } from "./server.js";

export interface McpHttpServerOptions {
  host?: string;
  port?: number;
  allowedOrigins?: readonly string[];
}

export interface RunningMcpHttpServer {
  host: string;
  port: number;
  endpoint: string;
  close(): Promise<void>;
}

class HttpRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly jsonRpcCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

export async function startMcpHttpServer(
  options: McpHttpServerOptions = {},
): Promise<RunningMcpHttpServer> {
  const host = options.host ?? DEFAULT_HTTP_HOST;
  const requestedPort = options.port ?? DEFAULT_HTTP_PORT;
  const configuredOrigins = options.allowedOrigins
    ? new Set(options.allowedOrigins)
    : undefined;
  let allowedOrigins = configuredOrigins ?? new Set<string>();

  const server = createHttpServer((request, response) => {
    void handleRequest(request, response, allowedOrigins).catch((error: unknown) => {
      handleUnhandledHttpError(response, error);
    });
  });

  await listen(server, host, requestedPort);

  const address = server.address();
  const port =
    address !== null && typeof address === "object" ? address.port : requestedPort;
  if (!configuredOrigins) {
    allowedOrigins = defaultAllowedOrigins(port);
  }

  return {
    host,
    port,
    endpoint: `http://${host}:${port}${MCP_HTTP_PATH}`,
    async close(): Promise<void> {
      await closeServer(server);
    },
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: ReadonlySet<string>,
): Promise<void> {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname !== MCP_HTTP_PATH) {
    sendJsonRpcError(response, 404, -32000, "Not found.");
    return;
  }

  const host = request.headers.host;
  if (!host || !isAllowedHost(host)) {
    sendJsonRpcError(response, 403, -32000, "Forbidden host.");
    return;
  }

  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    sendJsonRpcError(response, 403, -32000, "Forbidden origin.");
    return;
  }

  applyCorsHeaders(response, origin);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
    );
    response.setHeader("Access-Control-Max-Age", "600");
    response.end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJsonRpcError(response, 405, -32000, "Method not allowed.");
    return;
  }

  const contentType = request.headers["content-type"];
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    sendJsonRpcError(
      response,
      415,
      -32000,
      "Content-Type must be application/json.",
    );
    return;
  }

  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(request);
  } catch (error) {
    if (error instanceof HttpRequestError) {
      sendJsonRpcError(
        response,
        error.statusCode,
        error.jsonRpcCode,
        error.message,
      );
      return;
    }
    throw error;
  }

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  try {
    // Omitted sessionIdGenerator explicitly selects stateless mode.
    await server.connect(transport as unknown as Transport);
    await transport.handleRequest(request, response, parsedBody);
  } finally {
    await transport.close();
    await server.close();
  }
}

function handleUnhandledHttpError(
  response: ServerResponse,
  error: unknown,
): void {
  console.error("Error handling MCP HTTP request:", error);
  if (!response.headersSent) {
    sendJsonRpcError(response, 500, -32603, "Internal server error.");
  } else if (!response.writableEnded) {
    response.end();
  }
}

function isAllowedHost(hostHeader: string): boolean {
  const normalized = hostHeader.toLowerCase();
  try {
    const hostname = new URL(`http://${normalized}`).hostname;
    return ["127.0.0.1", "localhost", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
}

function defaultAllowedOrigins(port: number): Set<string> {
  return new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    `http://[::1]:${port}`,
  ]);
}

function applyCorsHeaders(
  response: ServerResponse,
  origin: string | undefined,
): void {
  if (!origin) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_HTTP_BODY_BYTES) {
      throw new HttpRequestError(
        413,
        -32000,
        `Request body exceeds ${MAX_HTTP_BODY_BYTES} bytes.`,
      );
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpRequestError(400, -32700, "Parse error.");
  }
}

function sendJsonRpcError(
  response: ServerResponse,
  statusCode: number,
  code: number,
  message: string,
): void {
  if (response.headersSent) {
    if (!response.writableEnded) {
      response.end();
    }
    return;
  }

  const body = JSON.stringify({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });

  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(body);
}

function listen(server: Server, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
