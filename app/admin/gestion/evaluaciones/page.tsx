import { EvaluationSessionsList } from "@/components/admin/evaluation-sessions-list";

export default function AdminGestionEvaluacionesPage() {
  return <EvaluationSessionsList basePath="/admin" role="admin" />;
}
