import { Activity, BarChart3, ShieldAlert } from "lucide-react";

export const AboutSection = () => {
  return (
    <section id="about" className="py-24 px-4 relative">
      {" "}
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
          Giới thiệu <span className="text-primary"> Dự án</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <h3 className="text-2xl font-semibold text-primary">
              Hệ thống Giám sát Môi trường
            </h3>

            <p className="text-muted-foreground leading-relaxed">
              Đây là giải pháp công nghệ tiên tiến nhằm giám sát, thu thập và phân tích dữ liệu môi trường sống theo thời gian thực. Hệ thống hỗ trợ đo đạc các chỉ số quan trọng như nồng độ bụi mịn PM2.5, PM10, khí CO2, nhiệt độ, độ ẩm, cường độ ánh sáng, tia cực tím UV và mức độ tiếng ồn xung quanh chúng ta.
            </p>

            <p className="text-muted-foreground leading-relaxed">
              Dự án hướng đến mục tiêu nâng cao nhận thức cộng đồng về chất lượng môi trường không khí, cung cấp các phân tích dữ liệu trực quan bằng đồ thị và phát cảnh báo kịp thời khi các chỉ số vượt quá ngưỡng an toàn cho sức khỏe.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a href="#contact" className="cosmic-button text-center">
                {" "}
                Liên hệ ngay
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="gradient-border p-6 card-hover">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-lg"> Giám sát thời gian thực</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Thu thập dữ liệu liên tục từ các cảm biến IoT để cập nhật trạng thái chất lượng không khí và môi trường xung quanh nhanh chóng, chính xác.
                  </p>
                </div>
              </div>
            </div>
            <div className="gradient-border p-6 card-hover">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-lg">Phân tích & Trực quan hóa</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Biểu diễn các chỉ số dưới dạng biểu đồ trực quan, giúp dễ dàng theo dõi xu hướng biến động của môi trường theo thời gian.
                  </p>
                </div>
              </div>
            </div>
            {/* <div className="gradient-border p-6 card-hover">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <ShieldAlert className="h-6 w-6 text-primary" />
                </div>

                <div className="text-left">
                  <h4 className="font-semibold text-lg">Cảnh báo thông minh</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Hệ thống tự động phát hiện và gửi cảnh báo tức thời khi các chỉ số ô nhiễm (bụi mịn, khí độc) vượt quá ngưỡng an toàn.
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
};

