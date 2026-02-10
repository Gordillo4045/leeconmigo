"use client";

import { motion } from "framer-motion";
import { BarChart3, Shield, Sparkles, Users } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Métricas Detalladas",
    description: "Seguimiento de tiempo de lectura, precisión, errores y progreso general del estudiante.",
  },
  {
    icon: Sparkles,
    title: "Contenido con IA",
    description: "Textos generados dinámicamente por inteligencia artificial adaptados al nivel del estudiante.",
  },
  {
    icon: Users,
    title: "Panel para Padres",
    description: "Los padres pueden monitorear el progreso de sus hijos con reportes visuales claros.",
  },
  {
    icon: Shield,
    title: "Seguro y Privado",
    description: "Protección de datos y acceso controlado para garantizar la seguridad de los estudiantes.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              Diseñado para docentes, estudiantes y padres
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Nuestra plataforma ofrece herramientas completas para evaluar y mejorar las habilidades lectoras, con dashboards intuitivos y reportes detallados.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-muted/50 rounded-3xl p-8 shadow-card">
              {/* Mock Dashboard */}
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-display font-bold text-lg">Panel de Progreso</h4>
                  <div className="text-xs text-muted-foreground">Esta semana</div>
                </div>
                
                {/* Progress bars */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Fluidez Lectora</span>
                      <span className="text-primary font-bold">85%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full gradient-primary rounded-full" style={{ width: "85%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Comprensión</span>
                      <span className="text-secondary font-bold">72%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full gradient-secondary rounded-full" style={{ width: "72%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Vocabulario</span>
                      <span className="text-accent font-bold">90%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full gradient-accent rounded-full" style={{ width: "90%" }} />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  <div className="text-center">
                    <div className="font-display text-2xl font-bold text-primary">12</div>
                    <div className="text-xs text-muted-foreground">Actividades</div>
                  </div>
                  <div className="text-center">
                    <div className="font-display text-2xl font-bold text-success">8</div>
                    <div className="text-xs text-muted-foreground">Completadas</div>
                  </div>
                  <div className="text-center">
                    <div className="font-display text-2xl font-bold text-accent">350</div>
                    <div className="text-xs text-muted-foreground">Puntos</div>
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

export default FeaturesSection;
