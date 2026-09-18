#!/usr/bin/env node

import {
  DEFAULT_HTTP_HOST,
  DEFAULT_HTTP_PORT,
  MCP_HTTP_PATH,
} from "./constants.js";
import { startMcpHttpServer } from "./http-server.js";

const port = parsePort(process.env.MCP_PORT);
const host = parseHost(process.env.MCP_HOST);
const allowedOrigins = parseAllowedOrigins(process.env.MCP_ALLOWED_ORIGINS);
const allowedHosts = parseAllowedHosts(process.env.MCP_ALLOWED_HOSTS);
const apiToken = parseApiToken(process.env.MCP_API_TOKEN);
const runningServer = await startMcpHttpServer({
  host,
  port,
  ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
  ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
  ...(apiToken !== undefined ? { apiToken } : {}),
});

console.error(
  `data-mcp-server listening at http://${host}:${runningServer.port}${MCP_HTTP_PATH}`,
);

let shuttingDown = false;
const shutdown = async (): Promise<void> => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  await runningServer.close();
  process.exit(0);
};

process.once("SIGINT", () => {
  void shutdown();
});
process.once("SIGTERM", () => {
  void shutdown();
});

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_HTTP_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(
      `MCP_PORT must be an integer between 0 and 65535; received "${value}".`,
    );
  }

  return port;
}

function parseHost(value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_HTTP_HOST;
  }

  const host = value.trim();
  if (host.includes("://") || host.includes("/")) {
    throw new Error(
      `MCP_HOST must be a bare hostname or IP (e.g. "0.0.0.0"); received "${value}".`,
    );
  }

  return host;
}

function parseAllowedHosts(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }

  const hosts = value
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host.length > 0);

  for (const host of hosts) {
    if (host.includes("://") || host.includes("/") || host.includes(" ")) {
      throw new Error(
        `MCP_ALLOWED_HOSTS contains an invalid host "${host}".`,
      );
    }
  }

  return hosts;
}

function parseApiToken(value: string | undefined): string | undefined {
  const token = value?.trim();
  if (token === undefined || token === "") {
    return undefined;
  }
  if (/\s/.test(token) || token.includes(",")) {
    throw new Error(
      "MCP_API_TOKEN must not contain whitespace or commas.",
    );
  }
  return token;
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.origin !== origin
      ) {
        throw new Error("invalid origin");
      }
    } catch {
      throw new Error(
        `MCP_ALLOWED_ORIGINS contains an invalid origin "${origin}".`,
      );
    }
  }

  return origins;
}
