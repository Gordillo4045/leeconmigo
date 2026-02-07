import { redirect } from "next/navigation";
import StudentAttemptClient from "./student-attempt-client";

export default async function StudentAttemptPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = (code ?? "").trim();

  if (!clean) redirect("/");

  return <StudentAttemptClient code={clean} />;
}
