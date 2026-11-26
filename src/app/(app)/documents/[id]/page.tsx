import { DocumentPage } from "@/components/editor/DocumentPage";

export default function DocumentRoute({ params }: { params: { id: string } }) {
  return <DocumentPage documentId={params.id} />;
}
