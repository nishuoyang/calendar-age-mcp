import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

const openClients: Client[] = [];

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
});

describe("MCP contract", () => {
  it("discovers read-only tools and returns structured JSON", async () => {
    const client = await connectClient();
    const listed = await client.listTools();

    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
      "calendar_calculate_age",
      "calendar_convert_date",
      "calendar_list_birthdays",
    ]);
    for (const tool of listed.tools) {
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      });
    }

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

    const markdownResponse = await client.callTool({
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
        response_format: "markdown",
      },
    });
    const markdownContent = markdownResponse.content as Array<{
      type: string;
      text?: string;
    }>;
    expect(markdownContent[0]?.text).toContain(
      "Normalized Gregorian: `2005-06-25`",
    );
  });

  it("returns stable tool errors instead of protocol failures", async () => {
    const client = await connectClient();
    const response = await client.callTool({
      name: "calendar_calculate_age",
      arguments: {
        birth_date: {
          calendar: "chinese_lunar",
          year: 2005,
          month: 5,
          day: 19,
          is_leap_month: false,
        },
        as_of_date: {
          calendar: "gregorian",
          year: 2026,
          month: 9,
          day: 16,
        },
        timezone: "Asia/Shanghai",
        age_systems: ["unknown"],
        leap_month_policy: "regular_month",
        nominal_age_rule: "lunar_new_year",
        response_format: "json",
      },
    });

    expect(response.isError).toBe(true);
    const content = response.content as Array<{
      type: string;
      text?: string;
    }>;
    expect(content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("UNSUPPORTED_AGE_SYSTEM"),
    });

    const calendarResponse = await client.callTool({
      name: "calendar_convert_date",
      arguments: {
        date: {
          calendar: "unknown",
          year: 2026,
          month: 9,
          day: 16,
        },
        target_calendar: "gregorian",
        response_format: "json",
      },
    });
    const calendarContent = calendarResponse.content as Array<{
      type: string;
      text?: string;
    }>;
    expect(calendarResponse.isError).toBe(true);
    expect(calendarContent[0]?.text).toContain("UNSUPPORTED_CALENDAR");
  });
});

async function connectClient(): Promise<Client> {
  const server = createServer();
  const client = new Client({
    name: "data-mcp-test-client",
    version: "0.1.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  openClients.push(client);
  return client;
}
