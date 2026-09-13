import { Presenter } from "@/components/Presenter";
import { loadCanvas } from "@/lib/canvas/load";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initial = await loadCanvas();
  return <Presenter initial={initial} />;
}
