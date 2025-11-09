// Layout components
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

// Effects
import { StarBackground } from "@/components/effects/StarBackground";

// Sections
import { LiveSection } from "@/components/sections/LiveSection";

export const LivePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col relative">
      {/* Background Effects */}
      <StarBackground />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* Navbar */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Main Content */}
      <main className="pt-20 pb-20 flex-grow relative z-20">
        <LiveSection />
      </main>

      {/* Footer */}
      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
};
