import { EvaluationSessionsList } from "@/components/admin/evaluation-sessions-list";

export default function MaestroGestionEvaluacionesPage() {
  return (
    <EvaluationSessionsList basePath="/maestro" role="maestro" />
  );
}
