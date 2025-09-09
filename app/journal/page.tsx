"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ReflectionJournal from "@/components/reflection-journal";
import Loading from "@/app/loading";

function JournalContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chatId");

  return <ReflectionJournal chatId={chatId || undefined} />;
}

export default function JournalPage() {
  return (
    <Suspense fallback={<Loading />}>
      <JournalContent />
    </Suspense>
  );
}