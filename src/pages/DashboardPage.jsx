import { Navbar } from "../components/layout/Navbar";
import { DashboardSection } from "@/components/sections/DashboardSection";

export const DashboardPage = () => {
  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Fixed navbar – doesn't occupy flow space, so we compensate with pt-16 below */}
      <Navbar />

      {/* pt-16 = 64px to push content below the fixed navbar */}
      <div className="flex-1 overflow-hidden pt-16">
        <DashboardSection />
      </div>
    </div>
  );
};
