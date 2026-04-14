// Layout components
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";


// Sections
import TemperatureChart from "@/components/sections/TemperatureChart";

export const ChartPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col relative">

      {/* Navbar */}
      <div className="relative">
        <Navbar />
      </div>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4 flex-grow relative">
        <TemperatureChart />
      </main>

      {/* Footer */}
      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
};
