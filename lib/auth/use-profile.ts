"use client";

import { useEffect, useState } from "react";
import { getMyProfile } from "./get-profile";

export type UserRole = "master" | "admin" | "maestro" | "tutor";

export function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await getMyProfile();
      setProfile(p);
      setLoading(false);
    };

    load();
  }, []);

  return {
    profile,
    role: profile?.role as UserRole | undefined,
    loading,
    isMaster: profile?.role === "master",
    isAdmin: profile?.role === "admin",
    isTeacher: profile?.role === "maestro",
    isTutor: profile?.role === "tutor",
  };
}
