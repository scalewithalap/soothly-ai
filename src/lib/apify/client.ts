/**
 * Apify Client
 * API client for running Apify actors
 */

import { ApifyClient } from "apify-client";

let client: ApifyClient | null = null;

/**
 * Get the singleton Apify client instance
 */
export function getApifyClient(): ApifyClient {
  if (!client) {
    const token = process.env.APIFY_API_TOKEN;

    if (!token) {
      throw new Error("APIFY_API_TOKEN environment variable is required");
    }

    client = new ApifyClient({ token });
  }

  return client;
}

/**
 * Run an Apify actor and wait for results
 */
export async function runActor<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  options?: {
    timeoutSecs?: number;
    memoryMbytes?: number;
  }
): Promise<T[]> {
  const apify = getApifyClient();

  const run = await apify.actor(actorId).call(input, {
    timeout: options?.timeoutSecs,
    memory: options?.memoryMbytes,
  });

  if (!run.defaultDatasetId) {
    return [];
  }

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();

  return items as T[];
}

/**
 * Start an Apify actor run asynchronously (returns run ID)
 */
export async function startActorRun(
  actorId: string,
  input: Record<string, unknown>,
  options?: {
    timeoutSecs?: number;
    memoryMbytes?: number;
  }
): Promise<string> {
  const apify = getApifyClient();

  const run = await apify.actor(actorId).start(input, {
    timeout: options?.timeoutSecs,
    memory: options?.memoryMbytes,
  });

  return run.id;
}

/**
 * Get the status and results of an actor run
 */
export async function getActorRunStatus(runId: string): Promise<{
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMED-OUT";
  datasetId?: string;
}> {
  const apify = getApifyClient();
  const run = await apify.run(runId).get();

  if (!run) {
    throw new Error(`Run ${runId} not found`);
  }

  return {
    status: run.status as
      | "RUNNING"
      | "SUCCEEDED"
      | "FAILED"
      | "ABORTED"
      | "TIMED-OUT",
    datasetId: run.defaultDatasetId,
  };
}

/**
 * Get results from a dataset
 */
export async function getDatasetItems<T = unknown>(
  datasetId: string,
  limit?: number
): Promise<T[]> {
  const apify = getApifyClient();
  const { items } = await apify.dataset(datasetId).listItems({ limit });
  return items as T[];
}
