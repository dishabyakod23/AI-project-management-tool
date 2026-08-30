import TaskBoardClient from "@/components/TaskBoardClient";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TaskBoardClient projectId={Number(id)} />;
}
