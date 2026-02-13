"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users,
  Building2,
  UserPlus,
  Plus,
  Search,
  Edit,
  Trash2,
  GraduationCap,
  UserCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

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

type Props = {
  institutionId?: string | null;
};

export function GestionPage({ institutionId }: Props = {}) {
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

  // Form states
  const [studentSearch, setStudentSearch] = useState("");
  const [classroomSearch, setClassroomSearch] = useState("");
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addCurp, setAddCurp] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);

  const [addClassroomOpen, setAddClassroomOpen] = useState(false);
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
  const [classroomFormName, setClassroomFormName] = useState("");
  const [classroomFormGradeId, setClassroomFormGradeId] = useState<number>(1);
  const [savingClassroom, setSavingClassroom] = useState(false);
  const [deletingClassroomId, setDeletingClassroomId] = useState<string | null>(null);

  const [addEnrollOpen, setAddEnrollOpen] = useState(false);
  const [addEnrollStudentId, setAddEnrollStudentId] = useState("");
  const [addingEnrollment, setAddingEnrollment] = useState(false);

  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [addTeacherProfileId, setAddTeacherProfileId] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(null);

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
      setAddStudentOpen(false);
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
      setAddEnrollOpen(false);
      await loadEnrollments();
      await loadStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAddingEnrollment(false);
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
      setAddTeacherOpen(false);
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
      setAddClassroomOpen(false);
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
    setAddClassroomOpen(true);
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
      setAddClassroomOpen(false);
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

  const enrolledStudentIds = enrollments.map((e) => e.student_id);
  const assignedTeacherIds = classroomTeachers.map((t) => t.teacher_profile_id);
  const teachersNotInClassroom = institutionTeachers.filter((t) => !assignedTeacherIds.includes(t.id));
  const studentsNotInClassroom = students.filter((s) => !enrolledStudentIds.includes(s.id));

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.curp.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)
    );
  });

  const filteredClassrooms = classrooms.filter((c) => {
    if (!classroomSearch.trim()) return true;
    const q = classroomSearch.toLowerCase();
    return c.name.toLowerCase().includes(q);
  });

  // Stats
  const totalStudents = students.length;
  const totalClassrooms = classrooms.length;
  const totalEnrollments = enrollments.length;
  const totalTeachers = classroomTeachers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestión de alumnos y salones</h1>
          <p className="text-muted-foreground mt-1">
            Como director, aquí das de alta alumnos en la institución y los asignas a salones.
          </p>
        </div>
        <div className="mt-3">
          <Button variant="outline" asChild>
            <Link href="/admin/gestion/evaluaciones">Ver evaluaciones publicadas</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alumnos</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Salones</p>
                <p className="text-2xl font-bold">{totalClassrooms}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inscripciones</p>
                <p className="text-2xl font-bold">{totalEnrollments}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profesores</p>
                <p className="text-2xl font-bold">{totalTeachers}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión</CardTitle>
          <CardDescription>Administra alumnos, salones e inscripciones desde aquí.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Alumnos</TabsTrigger>
              <TabsTrigger value="classrooms" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Salones</TabsTrigger>
              <TabsTrigger value="enrollments" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Inscripciones</TabsTrigger>
            </TabsList>

            {/* Tab: Alumnos */}
            <TabsContent value="students" className="space-y-4 mt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por CURP, nombre..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar alumno
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar nuevo alumno</DialogTitle>
                      <DialogDescription>
                        Ingresa los datos del alumno. El CURP debe tener entre 18 y 20 caracteres.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddStudent} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="curp">CURP (18-20 caracteres)</Label>
                        <Input
                          id="curp"
                          value={addCurp}
                          onChange={(e) => setAddCurp(e.target.value.toUpperCase())}
                          placeholder="ABCD123456..."
                          maxLength={20}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Nombre(s)</Label>
                        <Input
                          id="first_name"
                          value={addFirstName}
                          onChange={(e) => setAddFirstName(e.target.value)}
                          placeholder="Juan"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Apellidos</Label>
                        <Input
                          id="last_name"
                          value={addLastName}
                          onChange={(e) => setAddLastName(e.target.value)}
                          placeholder="Pérez García"
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAddStudentOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={addingStudent}>
                          {addingStudent ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            "Guardar alumno"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground">No hay alumnos</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {studentSearch ? "No se encontraron alumnos con ese criterio." : "Agrega el primer alumno usando el botón de arriba."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CURP</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Apellidos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.curp}</TableCell>
                          <TableCell>{s.first_name}</TableCell>
                          <TableCell>{s.last_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab: Salones */}
            <TabsContent value="classrooms" className="space-y-4 mt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar salón..."
                    value={classroomSearch}
                    onChange={(e) => setClassroomSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Dialog open={addClassroomOpen} onOpenChange={(open) => {
                  setAddClassroomOpen(open);
                  if (!open) {
                    setEditingClassroomId(null);
                    setClassroomFormName("");
                    setClassroomFormGradeId(1);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar salón
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingClassroomId ? "Editar salón" : "Agregar nuevo salón"}</DialogTitle>
                      <DialogDescription>
                        {editingClassroomId ? "Modifica el nombre o grado del salón." : "Crea un nuevo salón para la institución."}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editingClassroomId ? handleUpdateClassroom : handleCreateClassroom} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="classroom_name">Nombre del salón</Label>
                        <Input
                          id="classroom_name"
                          value={classroomFormName}
                          onChange={(e) => setClassroomFormName(e.target.value)}
                          placeholder="Ej. 1°A, Primero A, etc."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classroom_grade">Grado</Label>
                        <Select
                          value={String(classroomFormGradeId)}
                          onValueChange={(v) => setClassroomFormGradeId(parseInt(v, 10))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1er grado</SelectItem>
                            <SelectItem value="2">2do grado</SelectItem>
                            <SelectItem value="3">3er grado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                          setAddClassroomOpen(false);
                          setEditingClassroomId(null);
                          setClassroomFormName("");
                          setClassroomFormGradeId(1);
                        }}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={savingClassroom}>
                          {savingClassroom ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Guardando...
                            </>
                          ) : editingClassroomId ? (
                            "Actualizar"
                          ) : (
                            "Crear"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingClassrooms ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredClassrooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground">No hay salones</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {classroomSearch ? "No se encontraron salones con ese nombre." : "Crea el primer salón usando el botón de arriba."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Grado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClassrooms.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{c.grade_id}°</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClassroom(c)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClassroom(c.id)}
                                disabled={deletingClassroomId === c.id}
                              >
                                {deletingClassroomId === c.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tab: Inscripciones */}
            <TabsContent value="enrollments" className="space-y-4 mt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <Label>Seleccionar salón</Label>
                  <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId} disabled={loadingClassrooms}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un salón" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.grade_id}°)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClassroomId && (
                  <Dialog open={addEnrollOpen} onOpenChange={setAddEnrollOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Inscribir alumno
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Inscribir alumno en salón</DialogTitle>
                        <DialogDescription>
                          Selecciona un alumno para inscribirlo en este salón.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Alumno</Label>
                          <Select value={addEnrollStudentId} onValueChange={setAddEnrollStudentId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona alumno" />
                            </SelectTrigger>
                            <SelectContent>
                              {studentsNotInClassroom.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.last_name} {s.first_name} ({s.curp.slice(0, 10)}…)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {studentsNotInClassroom.length === 0 && students.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Todos los alumnos ya están inscritos en este salón (o en el mismo grado).
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setAddEnrollOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAddEnrollment} disabled={!addEnrollStudentId || addingEnrollment}>
                            {addingEnrollment ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Inscribiendo...
                              </>
                            ) : (
                              "Inscribir"
                            )}
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {!selectedClassroomId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground">Selecciona un salón</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Elige un salón de la lista para ver y gestionar sus inscripciones.
                  </p>
                </div>
              ) : loadingEnrollments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Inscripciones */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium">Alumnos inscritos ({enrollments.length})</h3>
                    </div>
                    {enrollments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
                        <Users className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nadie inscrito aún</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Alumno</TableHead>
                              <TableHead>CURP</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrollments.map((e) => (
                              <TableRow key={e.id}>
                                <TableCell>
                                  {e.student
                                    ? `${e.student.last_name} ${e.student.first_name}`
                                    : `Alumno ${e.student_id}`}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {e.student?.curp ?? "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={e.active ? "default" : "secondary"}>
                                    {e.active ? "Activo" : "Inactivo"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Profesores del salón */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium">Profesores de este salón</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Asigna maestros al salón para que puedan publicar evaluaciones.
                        </p>
                      </div>
                      {selectedClassroomId && (
                        <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" disabled={teachersNotInClassroom.length === 0}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Asignar profesor
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Asignar profesor al salón</DialogTitle>
                              <DialogDescription>
                                Selecciona un maestro de la institución para asignarlo a este salón.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Profesor</Label>
                                <Select value={addTeacherProfileId} onValueChange={setAddTeacherProfileId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona profesor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {teachersNotInClassroom.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.full_name || t.email || t.id.slice(0, 8)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {teachersNotInClassroom.length === 0 && institutionTeachers.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    Todos los maestros ya están asignados a este salón.
                                  </p>
                                )}
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setAddTeacherOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleAddTeacher} disabled={!addTeacherProfileId || addingTeacher}>
                                  {addingTeacher ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Asignando...
                                    </>
                                  ) : (
                                    "Asignar"
                                  )}
                                </Button>
                              </DialogFooter>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    {loadingClassroomTeachers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : classroomTeachers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
                        <UserCheck className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Ningún profesor asignado aún</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Profesor</TableHead>
                              <TableHead>Correo</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classroomTeachers.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell className="font-medium">
                                  {t.full_name || "Sin nombre"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {t.email ?? "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveTeacher(t.teacher_profile_id)}
                                    disabled={removingTeacherId !== null}
                                  >
                                    {removingTeacherId === t.teacher_profile_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Quitar"
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
