import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serializeError } from "../domain/errors.js";
import {
  calendarCalculateAgeInputSchema,
  calendarCalculateAgeOutputSchema,
  calendarConvertInputSchema,
  calendarConvertOutputSchema,
  calendarListBirthdaysInputSchema,
  calendarListBirthdaysOutputSchema,
} from "../schemas/calendar.js";
import { birthdayService } from "../services/birthday-service.js";
import {
  formatAgeResult,
  formatBirthdayListResult,
  formatConversionResult,
} from "../services/formatters.js";

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerCalendarTools(server: McpServer): void {
  server.registerTool(
    "calendar_convert_date",
    {
      title: "Convert Calendar Date",
      description:
        "Convert a validated Gregorian or Chinese lunar date into the other supported calendar.",
      inputSchema: calendarConvertInputSchema,
      outputSchema: calendarConvertOutputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (input) => {
      try {
        const result = birthdayService.convertDate(
          input.date,
          input.target_calendar,
        );
        return toolResult(
          result,
          formatConversionResult(result, input.response_format),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "calendar_calculate_age",
    {
      title: "Calculate Calendar Age",
      description:
        "Calculate explicitly requested age conventions from a Gregorian or Chinese lunar birth date.",
      inputSchema: calendarCalculateAgeInputSchema,
      outputSchema: calendarCalculateAgeOutputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (input) => {
      try {
        const result = birthdayService.calculateAge(input);
        return toolResult(result, formatAgeResult(result, input.response_format));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "calendar_list_birthdays",
    {
      title: "List Calendar Birthdays",
      description:
        "Map recurring birthdays into a bounded range and target calendar.",
      inputSchema: calendarListBirthdaysInputSchema,
      outputSchema: calendarListBirthdaysOutputSchema,
      annotations: TOOL_ANNOTATIONS,
    },
    async (input) => {
      try {
        const result = birthdayService.listBirthdays(input);
        return toolResult(
          result,
          formatBirthdayListResult(result, input.response_format),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

function toolResult<T extends object>(structuredContent: T, text: string) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: structuredContent as Record<string, unknown>,
  };
}

function toolError(error: unknown) {
  const serialized = serializeError(error);
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `${serialized.code}: ${serialized.message}\n${JSON.stringify(serialized.details, null, 2)}`,
      },
    ],
  };
}

