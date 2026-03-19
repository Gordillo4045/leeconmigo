"use client";

import React, { useState } from "react";
import { Search, CheckCircle2, Clock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchResult =
  | { found: false }
  | { found: true; alreadyAssigned: true; student: { id: string; firstName: string; lastName: string } }
  | { found: true; requestPending: true; student: { id: string; firstName: string; lastName: string } }
  | { found: true; student: { id: string; firstName: string; lastName: string; grade: number | null; institution: string | null } };

export default function SolicitarAlumnoPage() {
  const [curp, setCurp] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchResult(null);
    setError(null);
    setSubmitted(false);

    try {
      const res = await fetch(`/api/tutor/buscar-alumno?curp=${encodeURIComponent(curp)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
      setSearchResult(json as SearchResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo realizar la búsqueda. Intenta de nuevo.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSolicitar() {
    if (!searchResult || !searchResult.found) return;
    if ("alreadyAssigned" in searchResult || "requestPending" in searchResult) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tutor/solicitar-alumno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: searchResult.student.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);

      setCurp("");
      setSearchResult(null);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const foundStudent =
    searchResult?.found === true &&
    !("alreadyAssigned" in searchResult) &&
    !("requestPending" in searchResult)
      ? searchResult.student
      : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Solicitar alumno</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busca al alumno por su CURP. Si lo encuentras, podrás enviar una solicitud al maestro para
          ser asignado como tutor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Buscar alumno
          </CardTitle>
          <CardDescription>CURP del alumno</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="curp">CURP del alumno</Label>
              <Input
                id="curp"
                placeholder="Ej: ABCD123456HMCXXX01"
                value={curp}
                onChange={(e) => setCurp(e.target.value.toUpperCase())}
                maxLength={20}
                disabled={searching}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={searching || curp.length < 18}
              className="w-full sm:w-auto"
            >
              {searching ? "Buscando…" : "Buscar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {submitted && (
        <Card className="mt-6 border-success/40 bg-success/10">
          <CardContent className="flex items-start gap-3 py-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">¡Solicitud enviada!</span> El maestro recibirá una
              notificación y podrá aprobarte. Te avisaremos cuando sea procesada.
            </p>
          </CardContent>
        </Card>
      )}

      {searchResult && !submitted && (
        <div className="mt-6">
          {searchResult.found === false && (
            <Card className="border-destructive/40 bg-destructive/10">
              <CardContent className="py-5">
                <p className="text-sm text-destructive">
                  No se encontró ningún alumno con ese CURP. Verifica e intenta de nuevo.
                </p>
              </CardContent>
            </Card>
          )}

          {"alreadyAssigned" in searchResult && searchResult.alreadyAssigned && (
            <Card className="border-success/40 bg-success/10">
              <CardContent className="flex items-start gap-3 py-5">
                <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <p className="text-sm text-foreground">
                  Ya eres tutor de{" "}
                  <span className="font-semibold">
                    {searchResult.student.firstName} {searchResult.student.lastName}
                  </span>
                  .
                </p>
              </CardContent>
            </Card>
          )}

          {"requestPending" in searchResult && searchResult.requestPending && (
            <Card className="border-info/40 bg-info/10">
              <CardContent className="flex items-start gap-3 py-5">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-info" />
                <p className="text-sm text-foreground">
                  Ya tienes una solicitud pendiente para{" "}
                  <span className="font-semibold">
                    {searchResult.student.firstName} {searchResult.student.lastName}
                  </span>
                  . El maestro la revisará próximamente.
                </p>
              </CardContent>
            </Card>
          )}

          {foundStudent && (
            <Card>
              <CardContent className="pt-6">
                <div className="mb-5">
                  <p className="text-xl font-bold text-foreground">
                    {foundStudent.firstName} {foundStudent.lastName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {foundStudent.grade != null && (
                      <span className="text-sm text-muted-foreground">
                        Grado {foundStudent.grade}
                      </span>
                    )}
                    {foundStudent.institution && (
                      <span className="text-sm text-muted-foreground">
                        {foundStudent.institution}
                      </span>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button onClick={handleSolicitar} disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? "Enviando…" : "Solicitar"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {error && !searchResult && !submitted && (
        <Card className="mt-6 border-destructive/40 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
    </div>
  );
}
