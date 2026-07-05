"use client";

import { useEffect, useState } from "react";
import { subscribeToAiUsage, type AiUsage } from "@/lib/firestore/aiUsage";

export function useAiUsage(uid: string | undefined): AiUsage {
  const [usage, setUsage] = useState<AiUsage>({ today: 0, total: 0 });

  useEffect(() => {
    if (!uid) return;
    return subscribeToAiUsage(uid, setUsage);
  }, [uid]);

  return usage;
}
