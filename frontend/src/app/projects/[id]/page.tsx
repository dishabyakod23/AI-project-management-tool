import ProjectDetailClient from "@/components/ProjectDetailClient";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailClient projectId={Number(id)} />;
}
