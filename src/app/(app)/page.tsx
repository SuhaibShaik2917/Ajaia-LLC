import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { DocumentListSkeleton } from "@/components/ui/Skeleton";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <DocumentListSkeleton rows={4} />
        </div>
      }
    >
      <DashboardPage />
    </Suspense>
  );
}
