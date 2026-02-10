import Link from "next/link";
import { BookOpen } from "lucide-react";
import { CurrentYear } from "./CurrentYear";

const platformLinks = [
  { label: "Actividades", href: "/#actividades" },
  { label: "Para Docentes", href: "/maestro" },
  { label: "Para Padres", href: "/tutor" },
  { label: "Iniciar sesión", href: "/auth/login" },
];

const resourceLinks = [
  { label: "Cómo funciona", href: "/#inicio" },
  { label: "Recursos", href: "/#actividades" },
  { label: "Soporte", href: "/#contacto" },
];

const legalLinks = [
  { label: "Aviso de privacidad", href: "/legal/privacidad" },
  { label: "Términos de uso", href: "/legal/terminos" },
];

export function Footer() {

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo + descripción */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-playful">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                Lee Conmigo
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Plataforma de evaluación temprana de lectura para primaria. Actividades interactivas y métricas para docentes y familias.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              Plataforma
            </h4>
            <ul className="space-y-3">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              Recursos
            </h4>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© <CurrentYear /> Lee Conmigo. Todos los derechos reservados.</p>
          <p>
            Evaluación temprana de lectura · TecNM
          </p>
        </div>
      </div>
    </footer>
  );
}
