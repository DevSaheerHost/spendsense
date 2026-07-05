"use client";

import { useEffect, useState } from "react";
import { subscribeToLoans } from "@/lib/firestore/loans";
import type { Loan } from "@/lib/types";

export function useLoans(uid: string | undefined) {
  const [subscribedUid, setSubscribedUid] = useState(uid);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  if (uid !== subscribedUid) {
    setSubscribedUid(uid);
    setLoans([]);
    setLoading(!!uid);
  }

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToLoans(uid, (data) => {
      setLoans(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { loans, loading };
}
