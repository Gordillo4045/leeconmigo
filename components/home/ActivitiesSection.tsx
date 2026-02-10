"use client";

import { motion } from "framer-motion";
import { BookOpen, MessageSquare, Puzzle, Timer, Brain, List } from "lucide-react";
import { Button } from "@/components/ui/button";

const activities = [
  {
    icon: BookOpen,
    title: "Lectura Guiada",
    description: "Lee textos interactivos mientras el sistema evalúa tu fluidez y precisión.",
    color: "primary",
    bgClass: "bg-primary/10",
    iconClass: "text-primary",
  },
  {
    icon: MessageSquare,
    title: "Comprensión Lectora",
    description: "Responde preguntas sobre lo que leíste para demostrar tu comprensión.",
    color: "secondary",
    bgClass: "bg-secondary/10",
    iconClass: "text-secondary",
  },
  {
    icon: Puzzle,
    title: "Vocabulario",
    description: "Aprende nuevas palabras y su significado de forma divertida.",
    color: "accent",
    bgClass: "bg-accent/10",
    iconClass: "text-accent",
  },
  {
    icon: List,
    title: "Ordenar Secuencias",
    description: "Ordena los eventos de una historia en el orden correcto.",
    color: "success",
    bgClass: "bg-success/10",
    iconClass: "text-success",
  },
  {
    icon: Brain,
    title: "Inferencias",
    description: "Descubre información oculta en los textos usando pistas.",
    color: "info",
    bgClass: "bg-info/10",
    iconClass: "text-info",
  },
  {
    icon: Timer,
    title: "Fluidez Lectora",
    description: "Practica la lectura rápida y precisa con nuestro cronómetro.",
    color: "warning",
    bgClass: "bg-warning/10",
    iconClass: "text-warning",
  },
];

const ActivitiesSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Actividades Interactivas
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explora nuestras actividades diseñadas especialmente para evaluar y mejorar tus habilidades lectoras.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-card rounded-2xl p-6 shadow-card hover:shadow-lg transition-all duration-300 h-full border border-border/50 hover:border-primary/20 group-hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-xl ${activity.bgClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <activity.icon className={`w-7 h-7 ${activity.iconClass}`} />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  {activity.title}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activity.description}
                </p>
                <Button variant="ghost" className="p-0 h-auto font-semibold text-primary hover:text-primary/80 hover:bg-transparent">
                  Comenzar →
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ActivitiesSection;
