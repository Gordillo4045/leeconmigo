import { ResultadosSection } from "@/components/maestro/resultados-section";

export default function ResultadosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resultados</h1>
        <p className="text-sm text-muted-foreground">
          Análisis de evaluaciones de los alumnos de tus salones
        </p>
      </div>
      <ResultadosSection />
    </div>
  );
}
