import TaskDetailClient from "@/components/TaskDetailClient";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  return <TaskDetailClient projectId={Number(id)} taskId={Number(taskId)} />;
}
