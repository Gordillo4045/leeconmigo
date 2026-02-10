import Link from "next/link";
import { Suspense } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/auth-button";

const navLinks = [
  { label: "Inicio", href: "/#inicio" },
  { label: "Actividades", href: "/#actividades" },
  { label: "Mi Progreso", href: "/protected" },
  { label: "Para Docentes", href: "/maestro" },
];

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-playful">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">
            Lee Conmigo
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Suspense fallback={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild><Link href="/auth/login">Ingresar</Link></Button>
              <Button size="sm" asChild><Link href="/auth/sign-up">Registrarse</Link></Button>
            </div>
          }>
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
