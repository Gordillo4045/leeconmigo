"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GRADE_OPTIONS = [
  { value: 1, label: "1° grado" },
  { value: 2, label: "2° grado" },
  { value: 3, label: "3° grado" },
];

export default function TutorOnboardingPage() {
  const router = useRouter();
  const [childName, setChildName] = useState("");
  const [childGrade, setChildGrade] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!childName.trim()) {
      setError("Por favor escribe el nombre de tu hijo/a.");
      return;
    }
    if (!childGrade) {
      setError("Por favor selecciona el grado de tu hijo/a.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tutor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_name: childName.trim(), child_grade: childGrade }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);

      router.push("/tutor");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la información. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <BookOpen className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenido/a</h1>
          <p className="text-sm text-muted-foreground">
            Cuéntanos sobre tu hijo/a para personalizar tu experiencia
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información de tu hijo/a</CardTitle>
            <CardDescription>
              Esta información ayuda a los maestros a asociar tu cuenta con el alumno correcto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="child-name">Nombre de tu hijo/a</Label>
                <Input
                  id="child-name"
                  placeholder="Ej: María González"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Grado escolar</Label>
                <div className="flex gap-2">
                  {GRADE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setChildGrade(opt.value)}
                      disabled={submitting}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        childGrade === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Guardando…" : "Continuar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
