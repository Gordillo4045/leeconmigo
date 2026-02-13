"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GestionPage } from "@/components/admin/gestion-page";

export default function AdminGestionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const institutionId = searchParams.get("institution_id");

  // Admin siempre necesita institution_id; si falta, ir a Inicio para que redirija con el del perfil
  useEffect(() => {
    if (!institutionId) {
      router.replace("/admin");
    }
  }, [institutionId, router]);

  if (!institutionId) {
    return (
      <p className="text-sm text-muted-foreground">Redirigiendo…</p>
    );
  }

  return <GestionPage institutionId={institutionId} />;
}
