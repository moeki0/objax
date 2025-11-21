import { Canvas } from "@/components/Canvas";

export default async function WorldPage({
  params,
}: {
  params: Promise<{ url: string }>;
}) {
  const { url } = await params;
  return <Canvas initialWorldUrl={url} />;
}
