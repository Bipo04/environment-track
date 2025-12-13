import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { StarBackground } from "@/components/effects/StarBackground";

export const PrivatePage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col">
      {/* Background Effects */}
      <StarBackground />

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4 flex-grow">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-card p-8 rounded-lg shadow-lg">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              Dashboard <span className="text-primary">Protected</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Đây là trang được bảo vệ. Chỉ người dùng đã đăng nhập mới có thể truy cập.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
