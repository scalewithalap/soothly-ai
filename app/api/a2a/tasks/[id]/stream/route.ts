/**
 * A2A Task Stream API
 * Server-Sent Events for task updates
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getA2AServer } from "@/lib/agents/a2a";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/a2a/tasks/[id]/stream
 * Stream task updates via SSE
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: taskId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get org_id
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    return new Response("No organization found", { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const server = getA2AServer();

        for await (const event of server.streamTask(taskId, userData.org_id!)) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          // End stream on final event
          if ("final" in event && event.final) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            break;
          }
        }
      } catch (error) {
        const errorData = `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Stream error" })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
