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

type ClassroomTeacher = {
  id: string;
  teacher_profile_id: string;
  full_name: string | null;
  email: string | null;
};

type InstitutionTeacher = {
  id: string;
  full_name: string;
  email: string;
};

/** Si institutionId está definido (master), se envía en todas las peticiones. */
export default function AdminGestionPage({ institutionId }: { institutionId?: string | null } = {}) {
  const instParam = institutionId ? `institution_id=${encodeURIComponent(institutionId)}` : "";
  const instParamPrefix = instParam ? (url: string) => `${url}${url.includes("?") ? "&" : "?"}${instParam}` : (url: string) => url;
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classroomTeachers, setClassroomTeachers] = useState<ClassroomTeacher[]>([]);
  const [institutionTeachers, setInstitutionTeachers] = useState<InstitutionTeacher[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingClassroomTeachers, setLoadingClassroomTeachers] = useState(false);
  const [loadingInstitutionTeachers, setLoadingInstitutionTeachers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addCurp, setAddCurp] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  const [addEnrollStudentId, setAddEnrollStudentId] = useState("");
  const [addingEnrollment, setAddingEnrollment] = useState(false);

  const [addTeacherProfileId, setAddTeacherProfileId] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(null);

  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
  const [classroomFormName, setClassroomFormName] = useState("");
  const [classroomFormGradeId, setClassroomFormGradeId] = useState<number>(1);
  const [savingClassroom, setSavingClassroom] = useState(false);
  const [deletingClassroomId, setDeletingClassroomId] = useState<string | null>(null);

  const loadStudents = async () => {
    setLoadingStudents(true);
    setError(null);
    try {
      const res = await fetch(instParamPrefix("/api/admin/students"));
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
      const res = await fetch(instParamPrefix("/api/classrooms"));
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

  const loadClassroomTeachers = async () => {
    if (!selectedClassroomId) {
      setClassroomTeachers([]);
      return;
    }
    setLoadingClassroomTeachers(true);
    try {
      const res = await fetch(`/api/admin/classrooms/${selectedClassroomId}/teachers`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error");
      setClassroomTeachers(json.teachers ?? []);
    } catch {
      setClassroomTeachers([]);
    } finally {
      setLoadingClassroomTeachers(false);
    }
  };

  const loadInstitutionTeachers = async () => {
    setLoadingInstitutionTeachers(true);
    try {
      const res = await fetch(instParamPrefix("/api/admin/teachers"));
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error");
      setInstitutionTeachers(json.teachers ?? []);
    } catch {
      setInstitutionTeachers([]);
    } finally {
      setLoadingInstitutionTeachers(false);
    }
  };

  useEffect(() => {
    loadStudents();
    loadClassrooms();
    loadInstitutionTeachers();
  }, []);

  useEffect(() => {
    loadEnrollments();
    loadClassroomTeachers();
  }, [selectedClassroomId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCurp.trim() || !addFirstName.trim() || !addLastName.trim()) return;
    setAddingStudent(true);
    setError(null);
    try {
      const body: { curp: string; first_name: string; last_name: string; institution_id?: string } = {
        curp: addCurp.trim().toUpperCase(),
        first_name: addFirstName.trim(),
        last_name: addLastName.trim(),
      };
      if (institutionId) body.institution_id = institutionId;
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
const handleRemoveEnrollment = async (enrollmentId: string) => {
  if (!confirm("¿Dar de baja esta inscripción?")) return;

  setError(null);

  try {
    const res = await fetch(`/api/admin/enrollments?id=${enrollmentId}`, {
      method: "DELETE",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error ?? "Error al dar de baja");

    await loadEnrollments();
  } catch (e) {
    setError(e instanceof Error ? e.message : "Error");
  }
};

  const handleAddTeacher = async () => {
    if (!addTeacherProfileId || !selectedClassroomId) return;
    setAddingTeacher(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/classrooms/${selectedClassroomId}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_profile_id: addTeacherProfileId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al asignar profesor");
      setAddTeacherProfileId("");
      await loadClassroomTeachers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleRemoveTeacher = async (teacherProfileId: string) => {
    if (!selectedClassroomId) return;
    setRemovingTeacherId(teacherProfileId);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/classrooms/${selectedClassroomId}/teachers/${teacherProfileId}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al quitar profesor");
      await loadClassroomTeachers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setRemovingTeacherId(null);
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroomFormName.trim()) return;
    setSavingClassroom(true);
    setError(null);
    try {
      const body: { name: string; grade_id: number; institution_id?: string } = {
        name: classroomFormName.trim(),
        grade_id: classroomFormGradeId,
      };
      if (institutionId) body.institution_id = institutionId;
      const res = await fetch("/api/admin/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al crear salón");
      setClassroomFormName("");
      setClassroomFormGradeId(1);
      setShowAddClassroom(false);
      await loadClassrooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSavingClassroom(false);
    }
  };

  const handleEditClassroom = (c: Classroom) => {
    setEditingClassroomId(c.id);
    setClassroomFormName(c.name);
    setClassroomFormGradeId(c.grade_id);
  };

  const handleUpdateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassroomId || !classroomFormName.trim()) return;
    setSavingClassroom(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/classrooms/${editingClassroomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: classroomFormName.trim(),
          grade_id: classroomFormGradeId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al actualizar");
      setEditingClassroomId(null);
      setClassroomFormName("");
      setClassroomFormGradeId(1);
      await loadClassrooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSavingClassroom(false);
    }
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    if (!confirm("¿Eliminar este salón? Los alumnos inscritos y las evaluaciones asociadas se mantendrán.")) return;
    setDeletingClassroomId(classroomId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Error al eliminar");
      if (selectedClassroomId === classroomId) setSelectedClassroomId("");
      await loadClassrooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setDeletingClassroomId(null);
    }
  };

  const cancelClassroomForm = () => {
    setShowAddClassroom(false);
    setEditingClassroomId(null);
    setClassroomFormName("");
    setClassroomFormGradeId(1);
  };

  const enrolledStudentIds = enrollments.map((e) => e.student_id);
  const assignedTeacherIds = classroomTeachers.map((t) => t.teacher_profile_id);
  const teachersNotInClassroom = institutionTeachers.filter((t) => !assignedTeacherIds.includes(t.id));
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
          <CardTitle>Salones de la institución</CardTitle>
          <CardDescription>Gestiona los salones: crea nuevos, edita nombre o grado, o elimina salones que ya no se usen.</CardDescription>
          <div className="pt-2">
            {!showAddClassroom && !editingClassroomId && (
              <Button onClick={() => setShowAddClassroom(true)}>Agregar salón</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(showAddClassroom || editingClassroomId) && (
            <form
              onSubmit={editingClassroomId ? handleUpdateClassroom : handleCreateClassroom}
              className="rounded-lg border bg-muted/30 p-4 space-y-3"
            >
              <div className="grid gap-2">
                <Label htmlFor="classroom_name">Nombre del salón</Label>
                <Input
                  id="classroom_name"
                  value={classroomFormName}
                  onChange={(e) => setClassroomFormName(e.target.value)}
                  placeholder="Ej. 1°A, Primero A, etc."
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="classroom_grade">Grado</Label>
                <select
                  id="classroom_grade"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={classroomFormGradeId}
                  onChange={(e) => setClassroomFormGradeId(parseInt(e.target.value, 10))}
                  required
                >
                  <option value={1}>1er grado</option>
                  <option value={2}>2do grado</option>
                  <option value={3}>3er grado</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingClassroom}>
                  {savingClassroom ? "Guardando…" : editingClassroomId ? "Actualizar" : "Crear"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelClassroomForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {loadingClassrooms ? (
            <p className="text-sm text-muted-foreground">Cargando salones…</p>
          ) : classrooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay salones. Crea el primero arriba.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Grado</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">{c.grade_id}°</td>
                      <td className="p-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClassroom(c)}>
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClassroom(c.id)}
                          disabled={deletingClassroomId === c.id}
                        >
                          {deletingClassroomId === c.id ? "Eliminando…" : "Eliminar"}
                        </Button>
                      </td>
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
<ul className="space-y-2">
  {enrollments.map((e) => (
    <li
      key={e.id}
      className="flex items-center justify-between rounded border px-3 py-2 text-sm"
    >
      <span>
        {e.student
          ? `${e.student.last_name} ${e.student.first_name} (${e.student.curp})`
          : `Alumno ${e.student_id}`}
      </span>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleRemoveEnrollment(e.id)}
      >
        Dar de baja
      </Button>
    </li>
  ))}
</ul>

                  )}
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-2">Profesores de este salón</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Asigna maestros al salón para que puedan publicar evaluaciones en él.
                </p>
                <div className="flex flex-wrap items-end gap-2 mb-3">
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm min-w-[200px]"
                    value={addTeacherProfileId}
                    onChange={(e) => setAddTeacherProfileId(e.target.value)}
                    disabled={loadingInstitutionTeachers}
                  >
                    <option value="">Selecciona profesor</option>
                    {teachersNotInClassroom.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name || t.email || t.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAddTeacher}
                    disabled={!addTeacherProfileId || addingTeacher || teachersNotInClassroom.length === 0}
                  >
                    {addingTeacher ? "Asignando…" : "Asignar profesor"}
                  </Button>
                </div>
                {teachersNotInClassroom.length === 0 && institutionTeachers.length > 0 && (
                  <p className="text-sm text-muted-foreground">Todos los maestros de la institución ya están asignados a este salón.</p>
                )}
                {loadingClassroomTeachers ? (
                  <p className="text-sm text-muted-foreground">Cargando profesores…</p>
                ) : classroomTeachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ningún profesor asignado aún.</p>
                ) : (
                  <ul className="space-y-2">
                    {classroomTeachers.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                      >
                        <span>
                          {t.full_name || t.email || "Sin nombre"}
                          {t.email && <span className="text-muted-foreground ml-1">({t.email})</span>}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveTeacher(t.teacher_profile_id)}
                          disabled={removingTeacherId !== null}
                        >
                          {removingTeacherId === t.teacher_profile_id ? "Quitando…" : "Quitar"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
