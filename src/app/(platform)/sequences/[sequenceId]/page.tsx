import { Suspense } from "react";
import { SequenceBuilder } from "@/components/sequences/SequenceBuilder";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SequenceAnalytics } from "@/components/sequences/SequenceAnalytics";

interface PageProps {
  params: Promise<{ sequenceId: string }>;
}

export default async function SequenceDetailPage({ params }: PageProps) {
  const { sequenceId } = await params;

  return (
    <div className="flex flex-col space-y-4 p-4 md:p-8 max-w-[1600px] mx-auto h-[calc(100vh-65px)]">
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
          <h2 className="text-xl font-bold tracking-tight">Sequence Editor</h2>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Suspense fallback={<div>Loading editor...</div>}>
          <Tabs defaultValue="builder" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="builder">Builder</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="builder"
              className="flex-1 mt-0 h-full overflow-hidden"
            >
              <SequenceBuilder sequenceId={sequenceId} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 overflow-auto">
              <SequenceAnalytics sequenceId={sequenceId} />
            </TabsContent>

            <TabsContent value="enrollments" className="mt-0 overflow-auto">
              <div className="flex justify-end p-4">
                <Link href={`/sequences/${sequenceId}/enrollments`}>
                  <Button variant="outline">
                    Open Full Enrollment Manager
                  </Button>
                </Link>
              </div>
              {/* We could embed EnrollmentManager here too, but let's keep it simple for now or just link */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-muted-foreground mb-4">
                  Manage enrollments for this sequence.
                </p>
                <Link href={`/sequences/${sequenceId}/enrollments`}>
                  <Button>View Enrollments</Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </div>
  );
}
