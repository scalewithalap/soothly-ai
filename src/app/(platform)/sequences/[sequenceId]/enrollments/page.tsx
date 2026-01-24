import { Suspense } from "react";
import { EnrollmentManager } from "@/components/sequences/EnrollmentManager";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ sequenceId: string }>;
}

export default async function EnrollmentsPage({ params }: PageProps) {
  const { sequenceId } = await params;

  return (
    <div className="flex flex-col space-y-4 p-8 max-w-7xl mx-auto">
      <div className="flex items-center space-x-4 mb-2">
        <Link href="/sequences">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Sequence Enrollments
          </h2>
        </div>
      </div>

      <Suspense fallback={<div>Loading enrollments...</div>}>
        <EnrollmentManager sequenceId={sequenceId} />
      </Suspense>
    </div>
  );
}
