import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ActivitiesSection from "@/components/home/ActivitiesSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import CTASection from "@/components/home/CTASection";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section id="inicio" aria-label="Inicio">
          <HeroSection />
        </section>
        <section id="actividades" aria-label="Actividades">
          <ActivitiesSection />
        </section>
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
