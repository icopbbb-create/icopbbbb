import { redirect } from "next/navigation";

export default function SessionPage({ params }: { params: { id: string } }) {
  // Always redirect to the beautified notes UI
  return redirect(`/sessions/${params.id}/notes`);
}
