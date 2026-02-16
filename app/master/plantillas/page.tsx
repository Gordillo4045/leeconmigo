"use client";

import { TemplatesList } from "@/components/maestro/templates-list";

export default function MasterPlantillasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Plantillas de evaluación</h1>
      <p className="text-muted-foreground">
        Revisa y configura las plantillas (texto y 5 actividades). Puedes filtrar por institución en la API.
      </p>
      <TemplatesList configurarPrefix="/master" />
    </div>
  );
}
