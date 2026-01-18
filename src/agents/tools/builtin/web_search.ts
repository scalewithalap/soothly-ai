/**
 * Built-in MCP Tool: Web Search
 *
 * Allows agents to search the web for information.
 */

import type { MCPTool, MCPToolResult, ToolExecutionContext } from "../types";

export const webSearchTool: MCPTool = {
  name: "web_search",
  description:
    "Search the web for information. Returns relevant results with titles, snippets, and URLs.",
  category: "search",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query",
        minLength: 1,
        maxLength: 500,
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 5, max: 20)",
        minimum: 1,
        maximum: 20,
      },
      domain: {
        type: "string",
        description: "Limit search to a specific domain (optional)",
      },
    },
    required: ["query"],
  },
  annotations: {
    title: "Web Search",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    costHint: 1,
  },
  requiredPermissions: ["search:web"],

  handler: async (
    input: unknown,
    _context: ToolExecutionContext,
  ): Promise<MCPToolResult> => {
    const params = input as {
      query: string;
      limit?: number;
      domain?: string;
    };

    const limit = Math.min(params.limit || 5, 20);

    try {
      // Build search query
      let searchQuery = params.query;
      if (params.domain) {
        searchQuery += ` site:${params.domain}`;
      }

      // Use Serper API for web search (or fallback to mock)
      const serperApiKey = process.env.SERPER_API_KEY;

      if (!serperApiKey) {
        // Return mock results if no API key configured
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query: params.query,
                results: [
                  {
                    title: "Search API not configured",
                    snippet:
                      "Please configure SERPER_API_KEY for web search functionality.",
                    url: "https://serper.dev",
                  },
                ],
              }),
            },
          ],
        };
      }

      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: searchQuery,
          num: limit,
        }),
      });

      if (!response.ok) {
        return {
          content: [
            {
              type: "error",
              code: "SEARCH_FAILED",
              message: `Search API error: ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const data = (await response.json()) as {
        organic?: Array<{
          title: string;
          snippet: string;
          link: string;
        }>;
      };

      const results = (data.organic || []).map((result) => ({
        title: result.title,
        snippet: result.snippet,
        url: result.link,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query: params.query,
              resultCount: results.length,
              results,
            }),
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

