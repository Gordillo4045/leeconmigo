"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Plus, Search, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AssignedTutor = {
  assignmentId: string;
  tutorProfileId: string;
  tutorName: string;
  tutorEmail: string;
};

type Student = {
  id: string;
  name: string;
  grade: number | null;
  assignedTutors: AssignedTutor[];
};

type AvailableTutor = {
  id: string;
  full_name: string;
  email: string;
  child_name: string | null;
  child_grade: number | null;
};

type ApiResponse = {
  students: Student[];
  availableTutors: AvailableTutor[];
};

export function TutoresManager() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalStudent, setModalStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null); // tutor id being assigned
  const [removing, setRemoving] = useState<string | null>(null); // assignment id being removed

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/maestro/tutores");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      setData(json as ApiResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign(tutorId: string) {
    if (!modalStudent) return;
    setAssigning(tutorId);
    try {
      const res = await fetch("/api/maestro/tutores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: modalStudent.id, tutor_profile_id: tutorId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      await load();
      // Refresh modalStudent from updated data
      setModalStudent(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo asignar el tutor.");
    } finally {
      setAssigning(null);
    }
  }

  async function handleRemove(assignmentId: string) {
    setRemoving(assignmentId);
    try {
      const res = await fetch(`/api/maestro/tutores/${assignmentId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la asignación.");
    } finally {
      setRemoving(null);
    }
  }

  const students = data?.students ?? [];
  const availableTutors = data?.availableTutors ?? [];

  // Filter available tutors: not already assigned to this student
  const assignedTutorIds = new Set(
    (modalStudent?.assignedTutors ?? []).map((at) => at.tutorProfileId),
  );

  const filteredTutors = availableTutors.filter((t) => {
    if (assignedTutorIds.has(t.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.child_name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestión de Tutores</h1>
        <p className="text-sm text-muted-foreground">
          Asigna tutores a los alumnos de tus salones
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Alumnos y sus tutores
          </CardTitle>
          <CardDescription>
            Haz clic en "+" para asignar un tutor a un alumno
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay alumnos en tus salones aún.
            </p>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.grade ? `${student.grade}° grado` : "Sin grado"}
                    </p>
                    {/* Assigned tutor chips */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {student.assignedTutors.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sin tutores asignados</span>
                      ) : (
                        student.assignedTutors.map((at) => (
                          <span
                            key={at.assignmentId}
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            <UserCheck className="h-3 w-3" />
                            {at.tutorName}
                            <button
                              onClick={() => handleRemove(at.assignmentId)}
                              disabled={removing === at.assignmentId}
                              className="ml-1 rounded-full hover:text-destructive"
                              aria-label={`Desasignar ${at.tutorName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setModalStudent(student);
                    }}
                    className="shrink-0"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Asignar tutor
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      {modalStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalStudent(null);
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="font-semibold text-foreground">Asignar tutor</h2>
                <p className="text-xs text-muted-foreground">
                  Alumno: <span className="font-medium">{modalStudent.name}</span>
                </p>
              </div>
              <button
                onClick={() => setModalStudent(null)}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o nombre del hijo/a…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              <div className="max-h-72 overflow-y-auto">
                {filteredTutors.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {search
                      ? "No hay tutores que coincidan con la búsqueda."
                      : "No hay tutores disponibles para asignar."}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Tutor</th>
                        <th className="pb-2 text-left font-medium">Hijo/a declarado</th>
                        <th className="pb-2 text-left font-medium">Grado</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTutors.map((t) => (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-foreground">{t.full_name}</p>
                            <p className="text-xs text-muted-foreground">{t.email}</p>
                          </td>
                          <td className="py-3 pr-4 text-foreground">
                            {t.child_name ?? <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-3 pr-4 text-foreground">
                            {t.child_grade ? (
                              `${t.child_grade}°`
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleAssign(t.id)}
                              disabled={assigning === t.id}
                            >
                              {assigning === t.id ? "Asignando…" : "Asignar"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
