import AIAssistantClient from "@/components/AIAssistantClient";

export default async function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AIAssistantClient projectId={Number(id)} />;
}
