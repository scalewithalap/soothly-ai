import { Suspense } from "react";
import { SequenceList } from "@/components/sequences/SequenceList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function SequencesPage() {
  return (
    <div className="flex flex-col space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent">
            Email Sequences
          </h2>
          <p className="text-muted-foreground mt-2">
            Automate your outreach with multi-step email campaigns.
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading sequences...</div>}>
        <SequenceList />
      </Suspense>
    </div>
  );
}
