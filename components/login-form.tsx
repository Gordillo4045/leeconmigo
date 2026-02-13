"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showMasterForm, setShowMasterForm] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // El login con correo/contraseña está pensado para el usuario master.
      router.push("/master");
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al iniciar sesión.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    const supabase = createClient();
    setIsGoogleLoading(true);
    setError(null);

    try {
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) console.error(error);
      // OAuth redirige solo
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al conectar con Google.",
      );
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Accede con tu cuenta de Google para continuar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 justify-center gap-2 border-primary/40 bg-background hover:bg-primary/5"
                onClick={handleGoogle}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  "Conectando con Google..."
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center ">
                      <svg className="w-4 h-4 me-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.037 21.998a10.313 10.313 0 0 1-7.168-3.049 9.888 9.888 0 0 1-2.868-7.118 9.947 9.947 0 0 1 3.064-6.949A10.37 10.37 0 0 1 12.212 2h.176a9.935 9.935 0 0 1 6.614 2.564L16.457 6.88a6.187 6.187 0 0 0-4.131-1.566 6.9 6.9 0 0 0-4.794 1.913 6.618 6.618 0 0 0-2.045 4.657 6.608 6.608 0 0 0 1.882 4.723 6.891 6.891 0 0 0 4.725 2.07h.143c1.41.072 2.8-.354 3.917-1.2a5.77 5.77 0 0 0 2.172-3.41l.043-.117H12.22v-3.41h9.678c.075.617.109 1.238.1 1.859-.099 5.741-4.017 9.6-9.746 9.6l-.215-.002Z" clipRule="evenodd" /></svg>
                    </span>
                    <span>Continuar con Google</span>
                  </span>
                )}
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                Admins, maestros y tutores deben usar su cuenta de Google.
              </div>

              <div className="h-px w-full bg-border" />

              <button
                type="button"
                onClick={() => setShowMasterForm((prev) => !prev)}
                className="text-xs text-muted-foreground underline underline-offset-4 text-left"
              >
                {showMasterForm
                  ? "Ocultar acceso con correo (solo usuario master)"
                  : "¿Eres usuario master? Inicia con correo y contraseña"}
              </button>

              {showMasterForm && (
                <div className="mt-2 space-y-4 rounded-md border bg-muted/30 p-3">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="master@ejemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Contraseña</Label>
                      <Link
                        href="/auth/forgot-password"
                        className="ml-auto inline-block text-xs underline-offset-4 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
                      }}
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 leading-snug">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? "Iniciando sesión..." : "Iniciar sesión (master)"}
                  </Button>
                </div>
              )}
            </div>

            {/* <div className="mt-4 text-center text-sm">
              ¿No tienes cuenta?{" "}
              <Link href="/auth/sign-up" className="underline underline-offset-4">
                Crear cuenta
              </Link>
            </div> */}
          </form>
        </CardContent>
      </Card >
    </div >
  );
}
