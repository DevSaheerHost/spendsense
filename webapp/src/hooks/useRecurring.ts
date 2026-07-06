"use client";

import { useEffect, useState } from "react";
import { subscribeToRecurring } from "@/lib/firestore/recurring";
import type { RecurringTransaction } from "@/lib/types";

export function useRecurring(uid: string | undefined) {
  const [subscribedUid, setSubscribedUid] = useState(uid);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  if (uid !== subscribedUid) {
    setSubscribedUid(uid);
    setRecurring([]);
    setLoading(!!uid);
  }

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToRecurring(uid, (data) => {
      setRecurring(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { recurring, loading };
}
