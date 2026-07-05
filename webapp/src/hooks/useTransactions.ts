"use client";

import { useEffect, useState } from "react";
import { subscribeToTransactions } from "@/lib/firestore/transactions";
import type { Transaction } from "@/lib/types";

export function useTransactions(uid: string | undefined) {
  const [subscribedUid, setSubscribedUid] = useState(uid);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  if (uid !== subscribedUid) {
    setSubscribedUid(uid);
    setTransactions([]);
    setLoading(!!uid);
  }

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToTransactions(uid, (data) => {
      setTransactions(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { transactions, loading };
}
