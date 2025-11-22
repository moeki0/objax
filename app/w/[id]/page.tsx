import { WorldComponent } from "@/components/World";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorldComponent id={id} />;
}
