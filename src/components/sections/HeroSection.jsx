import { ArrowDown } from "lucide-react";
import myPhoto from "@/assets/anh_ban_than.jpg";

export const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-4"
    >
      <div className="container max-w-5xl mx-auto z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-left">
          {/* Left Column: Text */}
          <div className="space-y-6 flex flex-col justify-center items-start">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-left">
              <span className="block opacity-0 animate-fade-in text-foreground">
                Xin chào, tôi là
              </span>
              <span className="block text-primary opacity-0 animate-fade-in-delay-1 mt-2">
                Lê Quốc Đảng
              </span>
            </h1>

            <p className="text-xl md:text-2xl font-semibold text-muted-foreground opacity-0 animate-fade-in-delay-2">
              Đại học Bách Khoa Hà Nội
            </p>

            <p className="text-base md:text-lg text-muted-foreground opacity-0 animate-fade-in-delay-3 max-w-md">
              Hệ thống giám sát và quản lý chất lượng môi trường. 
              Theo dõi và phân tích các chỉ số môi trường sống thời gian thực nhằm hướng tới cuộc sống xanh, lành mạnh hơn.
            </p>
          </div>

          {/* Right Column: Photo */}
          <div className="flex justify-center items-center opacity-0 animate-fade-in-delay-2 order-first md:order-last">
            <div className="relative">
              {/* Glowing gradient background rings */}
              <div className="absolute -inset-0.5 bg-linear-to-r from-primary to-accent rounded-2xl blur-xl opacity-40 animate-pulse-subtle" />
              <div className="relative w-72 h-[380px] md:w-[360px] md:h-[480px] rounded-2xl overflow-hidden border-4 border-card shadow-2xl bg-neutral-950/20">
                <img
                  src={myPhoto}
                  alt="Lê Quốc Đảng"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
        <span className="text-sm text-muted-foreground mb-2"> Cuộn xuống </span>
        <ArrowDown className="h-5 w-5 text-primary" />
      </div>
    </section>
  );
};

