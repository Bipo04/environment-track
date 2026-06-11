// Layout components
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

// Sections
import { LiveSection } from "@/components/sections/LiveSection";

export const LivePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-clip flex flex-col relative">

      {/* Navbar */}
      <div className="relative">
        <Navbar />
      </div>

      {/* Main Content */}
      <main className="pt-20 pb-20 flex-grow relative">
        <LiveSection />
      </main>

      {/* Footer */}
      <div className="relative">
        <Footer />
      </div>
    </div>
  );
};
