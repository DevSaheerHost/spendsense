"use client";

import { useEffect, useState } from "react";
import { subscribeToUserProfile } from "@/lib/firestore/users";
import type { UserProfile } from "@/lib/types";

export function useUserProfile(uid: string | undefined) {
  const [subscribedUid, setSubscribedUid] = useState(uid);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  if (uid !== subscribedUid) {
    setSubscribedUid(uid);
    setProfile(null);
    setLoading(!!uid);
  }

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeToUserProfile(uid, (data) => {
      setProfile(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { profile, loading };
}
