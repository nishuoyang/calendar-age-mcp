import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { afterEach, describe, expect, it } from "vitest";
import {
  type RunningMcpHttpServer,
  startMcpHttpServer,
} from "../src/http-server.js";

const runningServers: RunningMcpHttpServer[] = [];
const openClients: Client[] = [];

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
  await Promise.all(
    runningServers.splice(0).map((server) => server.close()),
  );
});

describe("Streamable HTTP contract", () => {
  it("serves MCP tools over stateless JSON HTTP", async () => {
    const server = await startTestServer();
    const client = new Client({
      name: "data-mcp-http-test-client",
      version: "0.1.0",
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(server.endpoint),
      {
        requestInit: {
          headers: {
            Origin: new URL(server.endpoint).origin,
          },
        },
      },
    );

    await client.connect(transport as unknown as Transport);
    openClients.push(client);

    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      "calendar_calculate_age",
      "calendar_convert_date",
      "calendar_list_birthdays",
    ]);

    const response = await client.callTool({
      name: "calendar_convert_date",
      arguments: {
        date: {
          calendar: "chinese_lunar",
          year: 2005,
          month: 5,
          day: 19,
          is_leap_month: false,
        },
        target_calendar: "gregorian",
        response_format: "json",
      },
    });

    expect(response.isError).not.toBe(true);
    expect(response.structuredContent).toMatchObject({
      normalized_gregorian: "2005-06-25",
      target: {
        calendar: "gregorian",
        year: 2005,
        month: 6,
        day: 25,
      },
    });
  });

  it("rejects unsupported browser origins", async () => {
    const server = await startTestServer();
    const response = await fetch(server.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "0.1.0" },
        },
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        message: "Forbidden origin.",
      },
    });
  });

  it("supports preflight and rejects unsupported methods", async () => {
    const server = await startTestServer();
    const origin = new URL(server.endpoint).origin;
    const preflight = await fetch(server.endpoint, {
      method: "OPTIONS",
      headers: { Origin: origin },
    });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(origin);
    expect(preflight.headers.get("access-control-allow-methods")).toContain(
      "POST",
    );

    const getResponse = await fetch(server.endpoint, {
      headers: { Origin: origin },
    });
    expect(getResponse.status).toBe(405);
    expect(getResponse.headers.get("allow")).toBe("POST");
  });
});

async function startTestServer(): Promise<RunningMcpHttpServer> {
  const server = await startMcpHttpServer({ port: 0 });
  runningServers.push(server);
  return server;
}
