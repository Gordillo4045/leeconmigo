"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Student = {
  id: string;
  full_name: string;
  curp: string;
  grade_id: number;
};

type Classroom = {
  id: string;
  name: string;
  grade_id: number;
};

export default function AdminAlumnosPage({
  searchParams,
}: {
  searchParams: { institution_id?: string };
}) {
  const institutionId = searchParams?.institution_id ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  const [fullName, setFullName] = useState("");
  const [curp, setCurp] = useState("");
  const [gradeId, setGradeId] = useState<number>(1);

  const [studentId, setStudentId] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  const classroomsByGrade = useMemo(() => {
    const map = new Map<number, Classroom[]>();
    for (const c of classrooms) {
      const arr = map.get(c.grade_id) ?? [];
      arr.push(c);
      map.set(c.grade_id, arr);
    }
    return map;
  }, [classrooms]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [studentsRes, classroomsRes] = await Promise.all([
        fetch(`/api/admin/students?institution_id=${encodeURIComponent(institutionId)}`, { cache: "no-store" }),
        fetch(`/api/admin/classrooms?institution_id=${encodeURIComponent(institutionId)}`, { cache: "no-store" }),
      ]);

      const studentsJson = await studentsRes.json().catch(() => ({}));
      const classroomsJson = await classroomsRes.json().catch(() => ({}));

      if (!studentsRes.ok) throw new Error(studentsJson?.error ?? `Students ${studentsRes.status}`);
      if (!classroomsRes.ok) throw new Error(classroomsJson?.error ?? `Classrooms ${classroomsRes.status}`);

      setStudents((studentsJson.students ?? []) as Student[]);
      setClassrooms((classroomsJson.classrooms ?? []) as Classroom[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
      setStudents([]);
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  }

  async function createStudent() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          institution_id: institutionId,
          full_name: fullName.trim(),
          curp: curp.trim().toUpperCase(),
          grade_id: gradeId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);

      setFullName("");
      setCurp("");
      setGradeId(1);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear alumno");
    } finally {
      setSaving(false);
    }
  }

  async function enrollStudent() {
    if (!studentId || !classroomId) return;

    setEnrolling(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          institution_id: institutionId,
          student_id: studentId,
          classroom_id: classroomId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Error ${res.status}`);

      setStudentId("");
      setClassroomId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al inscribir alumno");
    } finally {
      setEnrolling(false);
    }
  }

  useEffect(() => {
    if (!institutionId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  if (!institutionId) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-display font-bold">Alumnos</h1>
        <p className="text-muted-foreground">Falta institution_id.</p>
        <Button asChild variant="outline">
          <Link href="/admin">Volver</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Alumnos</h1>
          <p className="text-muted-foreground mt-1">
            Da de alta alumnos y luego inscríbelos en un salón.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href={`/admin/gestion/salones?institution_id=${institutionId}`}>
            Salones
          </Link>
        </Button>
      </div>

      {/* CREAR ALUMNO */}
      <Card>
        <CardHeader>
          <CardTitle>Crear alumno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="grid gap-2 max-w-xl">
            <input
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
            />

            <input
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={curp}
              onChange={(e) => setCurp(e.target.value)}
              placeholder="CURP"
            />

            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={gradeId}
              onChange={(e) => setGradeId(parseInt(e.target.value, 10))}
            >
              <option value={1}>1°</option>
              <option value={2}>2°</option>
              <option value={3}>3°</option>
            </select>

            <Button
              onClick={createStudent}
              disabled={saving || !fullName.trim() || !curp.trim()}
            >
              {saving ? "Creando…" : "Crear"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* INSCRIBIR */}
      <Card>
        <CardHeader>
          <CardTitle>Inscribir alumno en salón</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm w-full max-w-xl"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Selecciona alumno</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.curp})
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded-md border bg-background px-3 text-sm w-full max-w-xl"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          >
            <option value="">Selecciona salón</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Button
            onClick={enrollStudent}
            disabled={!studentId || !classroomId || enrolling}
          >
            {enrolling ? "Inscribiendo…" : "Inscribir"}
          </Button>
        </CardContent>
      </Card>

      {/* LISTA */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de alumnos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando…</div>
          ) : students.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay alumnos.</div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-3 text-left">Nombre</th>
                    <th className="p-3 text-left">CURP</th>
                    <th className="p-3 text-left">Grado</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">{s.full_name}</td>
                      <td className="p-3 font-mono text-xs">{s.curp}</td>
                      <td className="p-3">{s.grade_id}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
