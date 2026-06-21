import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Layout components
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

// Effects
import { StarBackground } from "@/components/effects/StarBackground";

// Sections
import { HeroSection } from "../components/sections/HeroSection";
import { AboutSection } from "../components/sections/AboutSection";
import { SkillsSection } from "../components/sections/SkillsSection";
// import { ProjectsSection } from "../components/sections/ProjectsSection";
import { ContactSection } from "../components/sections/ContactSection";

export const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (location.state?.loginSuccess) {
      toast({
        title: "Đăng nhập thành công!",
        description: "Chào mừng bạn đã đến với hệ thống.",
        duration: 5000,
        className: "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
      });
      // Clear navigation state so the toast doesn't show again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, toast, navigate]);
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
