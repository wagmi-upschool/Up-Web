"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home by default
    router.push("/home");
  }, [router]);

  return null;
}
