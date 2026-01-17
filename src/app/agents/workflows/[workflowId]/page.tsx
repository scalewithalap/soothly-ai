import { WorkflowBuilder } from "@/components/agents/workflows/WorkflowBuilder";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const resolvedParams = await params;
  return <WorkflowBuilder workflowId={resolvedParams.workflowId} />;
}
