// Layout components
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

// Effects
import { StarBackground } from "@/components/effects/StarBackground";

// Sections
import { HeroSection } from "../components/sections/HeroSection";
import { AboutSection } from "../components/sections/AboutSection";
import { SkillsSection } from "../components/sections/SkillsSection";
import { ProjectsSection } from "../components/sections/ProjectsSection";
import { ContactSection } from "../components/sections/ContactSection";

export const Home = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background Effects */}
      <StarBackground />

      {/* Navbar */}
      <Navbar />
      {/* Main Content */}
      <main>
        <HeroSection />
        <AboutSection />
        <SkillsSection />
        {/* <ProjectsSection /> */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
