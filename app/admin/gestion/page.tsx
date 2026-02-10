"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Student = {
  id: string;
  curp: string;
  first_name: string;
  last_name: string;
  created_at?: string;
};

type Classroom = {
  id: string;
  name: string;
  grade_id: number;
};

type Enrollment = {
  id: string;
  student_id: string;
  enrolled_at: string;
  active: boolean;
  student: { id: string; curp: string; first_name: string; last_name: string } | null;
};

export default function AdminGestionPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addCurp, setAddCurp] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  const [addEnrollStudentId, setAddEnrollStudentId] = useState("");
  const [addingEnrollment, setAddingEnrollment] = useState(false);

  const loadStudents = async () => {
    setLoadingStudents(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al cargar alumnos");
      setStudents(json.students ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar alumnos");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadClassrooms = async () => {
    setLoadingClassrooms(true);
    try {
      const res = await fetch("/api/classrooms");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Error");
      setClassrooms(json.classrooms ?? []);
      if (!selectedClassroomId && json.classrooms?.length) setSelectedClassroomId(json.classrooms[0].id);
    } catch {
      setClassrooms([]);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const loadEnrollments = async () => {
    if (!selectedClassroomId) {
      setEnrollments([]);
      return;
    }
    setLoadingEnrollments(true);
    try {
      const res = await fetch(`/api/admin/enrollments?classroom_id=${selectedClassroomId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error");
      setEnrollments(json.enrollments ?? []);
    } catch {
      setEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  useEffect(() => {
    loadStudents();
    loadClassrooms();
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [selectedClassroomId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCurp.trim() || !addFirstName.trim() || !addLastName.trim()) return;
    setAddingStudent(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curp: addCurp.trim().toUpperCase(),
          first_name: addFirstName.trim(),
          last_name: addLastName.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = [json?.error, json?.message].filter(Boolean).join(": ") || "Error al crear alumno";
        throw new Error(msg);
      }
      setAddCurp("");
      setAddFirstName("");
      setAddLastName("");
      setShowAddStudent(false);
      await loadStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAddingStudent(false);
    }
  };

  const handleAddEnrollment = async () => {
    if (!addEnrollStudentId || !selectedClassroomId) return;
    setAddingEnrollment(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: addEnrollStudentId, classroom_id: selectedClassroomId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al inscribir");
      setAddEnrollStudentId("");
      await loadEnrollments();
      await loadStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAddingEnrollment(false);
    }
  };

  const enrolledStudentIds = enrollments.map((e) => e.student_id);
  const studentsNotInClassroom = students.filter((s) => !enrolledStudentIds.includes(s.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Gestión de alumnos y salones</h1>
        <p className="text-muted-foreground mt-1">
          Como director, aquí das de alta alumnos en la institución y los asignas a salones.
        </p>
        <div className="mt-3">
          <Button variant="outline" asChild>
            <Link href="/admin/gestion/evaluaciones">Ver evaluaciones publicadas</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alumnos de la institución</CardTitle>
          <CardDescription>Lista de alumnos registrados. Agrega nuevos y asígnalos a un salón abajo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddStudent(true)}>Agregar alumno</Button>
          </div>

          {showAddStudent && (
            <form onSubmit={handleAddStudent} className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="curp">CURP (18-20 caracteres)</Label>
                <Input
                  id="curp"
                  value={addCurp}
                  onChange={(e) => setAddCurp(e.target.value.toUpperCase())}
                  placeholder="ABCD123456..."
                  maxLength={20}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="first_name">Nombre(s)</Label>
                <Input id="first_name" value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="Juan" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last_name">Apellidos</Label>
                <Input id="last_name" value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Pérez García" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={addingStudent}>
                  {addingStudent ? "Guardando..." : "Guardar alumno"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddStudent(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {loadingStudents ? (
            <p className="text-sm text-muted-foreground">Cargando alumnos...</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay alumnos registrados. Agrega el primero arriba.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">CURP</th>
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Apellidos</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{s.curp}</td>
                      <td className="p-3">{s.first_name}</td>
                      <td className="p-3">{s.last_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inscribir alumnos en un salón</CardTitle>
          <CardDescription>Elige un salón y agrega alumnos. Solo aparecen alumnos de esta institución que aún no estén en el salón.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium">Salón</label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              disabled={loadingClassrooms}
            >
              <option value="">Selecciona un salón</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade_id}°)
                </option>
              ))}
            </select>
          </div>

          {selectedClassroomId && (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm font-medium">Agregar alumno al salón</label>
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm min-w-[200px]"
                  value={addEnrollStudentId}
                  onChange={(e) => setAddEnrollStudentId(e.target.value)}
                >
                  <option value="">Selecciona alumno</option>
                  {studentsNotInClassroom.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.last_name} {s.first_name} ({s.curp.slice(0, 10)}…)
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddEnrollment} disabled={!addEnrollStudentId || addingEnrollment}>
                  {addingEnrollment ? "Inscribiendo..." : "Inscribir"}
                </Button>
              </div>
              {studentsNotInClassroom.length === 0 && students.length > 0 && (
                <p className="text-sm text-muted-foreground">Todos los alumnos ya están inscritos en este salón (o en el mismo grado).</p>
              )}

              {loadingEnrollments ? (
                <p className="text-sm text-muted-foreground">Cargando inscripciones...</p>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-2">Inscritos en este salón ({enrollments.length})</p>
                  {enrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nadie inscrito aún.</p>
                  ) : (
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {enrollments.map((e) => (
                        <li key={e.id}>
                          {e.student
                            ? `${e.student.last_name} ${e.student.first_name} (${e.student.curp})`
                            : `Alumno ${e.student_id}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {!loadingClassrooms && classrooms.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay salones en la institución. Crea salones desde el panel de master o configuración.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
