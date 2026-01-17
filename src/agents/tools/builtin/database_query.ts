/**
 * Built-in MCP Tool: Database Query
 *
 * Allows agents to query organization data securely.
 */

import type { MCPTool, MCPToolResult, ToolExecutionContext } from "../types";
import { createClient } from "@/lib/supabase/server";

export const databaseQueryTool: MCPTool = {
  name: "database_query",
  description:
    "Query organization data from the database. Supports SELECT queries only for security. Returns matching records.",
  category: "database",
  inputSchema: {
    type: "object",
    properties: {
      table: {
        type: "string",
        description:
          "Table name to query (e.g., leads, contacts, content, partners)",
      },
      select: {
        type: "string",
        description:
          "Columns to select, comma-separated. Use * for all columns.",
      },
      filters: {
        type: "object",
        description: "Key-value pairs for WHERE conditions (equality only)",
      },
      orderBy: {
        type: "string",
        description: "Column to order by",
      },
      ascending: {
        type: "boolean",
        description: "Sort ascending (true) or descending (false)",
      },
      limit: {
        type: "number",
        description:
          "Maximum number of records to return (default: 100, max: 1000)",
        minimum: 1,
        maximum: 1000,
      },
    },
    required: ["table"],
  },
  annotations: {
    title: "Database Query",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
  requiredPermissions: ["data:read"],

  handler: async (
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<MCPToolResult> => {
    const params = input as {
      table: string;
      select?: string;
      filters?: Record<string, unknown>;
      orderBy?: string;
      ascending?: boolean;
      limit?: number;
    };

    // Allowed tables for querying
    const allowedTables = [
      "leads",
      "contacts",
      "content",
      "partners",
      "contracts",
      "invoices",
      "transactions",
      "products",
      "orders",
    ];

    if (!allowedTables.includes(params.table)) {
      return {
        content: [
          {
            type: "error",
            code: "INVALID_TABLE",
            message: `Table "${params.table}" is not queryable. Allowed: ${allowedTables.join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const supabase = await createClient();

      // Build query with org_id filter for data isolation
      // Cast to any to bypass strict typing for dynamic table names
      let query = (supabase as any)
        .from(params.table)
        .select(params.select || "*")
        .eq("org_id", context.orgId);

      // Apply additional filters
      if (params.filters) {
        for (const [key, value] of Object.entries(params.filters)) {
          query = query.eq(key, value);
        }
      }

      // Apply ordering
      if (params.orderBy) {
        query = query.order(params.orderBy, {
          ascending: params.ascending ?? true,
        });
      }

      // Apply limit
      const limit = Math.min(params.limit || 100, 1000);
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        return {
          content: [
            {
              type: "error",
              code: "QUERY_FAILED",
              message: error.message,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                table: params.table,
                count: data?.length || 0,
                records: data,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "error",
            code: "EXECUTION_FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  },
};
