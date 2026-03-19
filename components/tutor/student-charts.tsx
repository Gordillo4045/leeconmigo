"use client";

import dynamic from "next/dynamic";

type Attempt = {
  id: string;
  scorePercent: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  submittedAt: string | null;
  readingTimeSec: number | null;
};

const StudentChartsInner = dynamic(
  () => import("./student-charts-inner").then((m) => ({ default: m.StudentChartsInner })),
  { ssr: false, loading: () => null },
);

export function StudentCharts({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) return null;
  return <StudentChartsInner attempts={attempts} />;
}
