import {
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const ContactSection = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    setTimeout(() => {
      toast({
        title: "Đã gửi tin nhắn!",
        description: "Cảm ơn bạn đã liên hệ. Tôi sẽ phản hồi bạn trong thời gian sớm nhất.",
      });
      setIsSubmitting(false);
    }, 1500);
  };
  return (
    <section id="contact" className="py-24 px-4 relative bg-secondary/30">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
          Liên <span className="text-primary"> hệ</span>
        </h2>

        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Bạn có ý kiến đóng góp về dự án hoặc muốn hợp tác phát triển? Đừng ngần ngại liên hệ với tôi. Tôi luôn sẵn sàng trao đổi các cơ hội và công nghệ mới.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-2xl font-semibold mb-6">
              {" "}
              Thông tin liên hệ
            </h3>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-foreground/80">ledang1324@gmail.com</span>
              </div>
              <div className="flex items-center space-x-4">
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-foreground/80">+84 336125164</span>
              </div>
              <div className="flex items-center space-x-4">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-foreground/80">Đông Anh, Hà Nội</span>
              </div>
            </div>
          </div>

          <div
            className="bg-card p-8 rounded-lg shadow-xs"
            onSubmit={handleSubmit}
          >
            <h3 className="text-2xl font-semibold mb-6"> Gửi tin nhắn</h3>

            <form className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary peer"
                  placeholder=" "
                />
                <label
                  htmlFor="name"
                  className="absolute left-4 top-3 text-muted-foreground transition-all duration-200 peer-focus:top-[-10px] peer-focus:left-3 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1"
                >
                  Tên của bạn
                </label>
              </div>

              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary peer"
                  placeholder=" "
                />
                <label
                  htmlFor="email"
                  className="absolute left-4 top-3 text-muted-foreground transition-all duration-200 peer-focus:top-[-10px] peer-focus:left-3 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1"
                >
                  Email của bạn
                </label>
              </div>

              <div className="relative">
                <textarea
                  id="message"
                  name="message"
                  required
                  rows="5"
                  className="w-full px-4 py-3 rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary resize-none peer"
                  placeholder=" "
                />
                <label
                  htmlFor="message"
                  className="absolute left-4 top-3 text-muted-foreground transition-all duration-200 peer-focus:top-[-10px] peer-focus:left-3 peer-focus:text-xs peer-focus:text-primary peer-focus:bg-background peer-focus:px-1 peer-[:not(:placeholder-shown)]:top-[-10px] peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1"
                >
                  Lời nhắn của bạn
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "cosmic-button w-full flex items-center justify-center gap-2 cursor-pointer"
                )}
              >
                {isSubmitting ? "Đang gửi..." : "Gửi tin nhắn"}
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

