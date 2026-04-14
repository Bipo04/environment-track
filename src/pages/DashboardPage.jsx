import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { DashboardSection } from "@/components/sections/DashboardSection";
import { DeviceSidebar } from "@/components/sections/dashboard/DeviceSidebar";

export const DashboardPage = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Fixed navbar – doesn't occupy flow space, so we compensate with pt-16 below */}
      <Navbar />

      {/* pt-16 = 64px to push content below the fixed navbar */}
      <div className="px-2 pb-4 pt-18 sm:px-4 sm:pb-6 sm:pt-20 lg:px-6">
        <div className="mx-auto w-full max-w-[1700px] rounded-lg border border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
          <div className="flex min-h-[calc(100vh-7rem)] overflow-hidden rounded-lg">
            <aside className="hidden lg:block border-r border-border/50 bg-card/70">
              <DeviceSidebar />
            </aside>

            <div className="min-w-0 flex-1">
              <DashboardSection />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed left-0 top-1/2 z-40 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur lg:hidden"
        aria-label="Mở quản lý thiết bị"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Đóng quản lý thiết bị"
          />

          <div className="absolute left-0 top-0 h-full w-[min(82vw,320px)] border-r border-border/60 bg-card shadow-2xl">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background/80 text-foreground shadow-sm"
              aria-label="Đóng quản lý thiết bị"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <DeviceSidebar className="h-full w-full" />
          </div>
        </div>
      ) : null}
    </div>
  );
};
