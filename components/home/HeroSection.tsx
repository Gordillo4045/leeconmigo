"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const heroImageSrc = "/hero-children-reading.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] gradient-hero overflow-hidden pt-24 pb-12">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-accent/30 animate-float" />
        <div className="absolute top-40 right-20 w-16 h-16 rounded-full bg-secondary/30 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-40 left-1/4 w-12 h-12 rounded-full bg-primary/20 animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/3 right-1/3 w-8 h-8 rounded-full bg-success/30 animate-float" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">Aprender a leer es divertido</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Descubre el mundo de la{" "}
              <span className="text-gradient-primary">lectura</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Actividades interactivas diseñadas para evaluar y mejorar las habilidades lectoras de niños de primaria de manera divertida.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="xl" className="group" asChild>
                <Link href="/auth/sign-up">
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  ¡Comenzar Ahora!
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/#actividades">Ver Demo</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-primary">1,000+</div>
                <div className="text-sm text-muted-foreground">Estudiantes</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-secondary">50+</div>
                <div className="text-sm text-muted-foreground">Actividades</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Main illustration container */}
              <div className="absolute inset-0 rounded-3xl gradient-primary opacity-10" />
              <div className="absolute inset-4 rounded-2xl bg-card shadow-card flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImageSrc}
                  alt="Niños leyendo"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-card rounded-2xl shadow-card p-4 animate-bounce-soft">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">¡Excelente!</div>
                    <div className="text-xs text-muted-foreground">Nivel completado</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-card p-4 animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-accent fill-accent" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">+50 puntos</div>
                    <div className="text-xs text-muted-foreground">Ganados hoy</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
