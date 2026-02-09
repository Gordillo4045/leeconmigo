import { Suspense } from "react";
import { redirect } from "next/navigation";
import StudentAttemptClient from "./student-attempt-client";

async function AttemptContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = (code ?? "").trim();

  if (!clean) redirect("/");

  return <StudentAttemptClient code={clean} />;
}

export default function StudentAttemptPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center p-6 text-center text-foreground">
            <p className="text-muted-foreground">Cargando evaluación…</p>
          </div>
        }
      >
        <AttemptContent params={params} />
      </Suspense>
    </main>
  );
}
