import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useEffect, useMemo, useState } from "react";
import { historyService } from "@/services/historyService";
import { useNavigate } from "react-router-dom";

const METRICS = [
  { key: "temperature", label: "Nhiệt độ", unit: "°C", decimals: 1 },
  { key: "humidity", label: "Độ ẩm", unit: "%", decimals: 1 },
  { key: "lux", label: "Lux", unit: "", decimals: 0 },
  { key: "UVI", label: "UVI", unit: "", decimals: 2 },
  { key: "UVA", label: "UVA", unit: "", decimals: 2 },
  { key: "UVB", label: "UVB", unit: "", decimals: 2 },
  { key: "broadband", label: "Broadband", unit: "", decimals: 0 },
  { key: "infrared", label: "Infrared", unit: "", decimals: 0 },
  { key: "sound", label: "Âm thanh", unit: "dB", decimals: 1 },
];

const formatMetric = (value, metricKey) => {
  const metric = METRICS.find((item) => item.key === metricKey) || METRICS[0];
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const numeric = Number(value);
  return `${numeric.toFixed(metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`;
};

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedMetricGroup, setSelectedMetricGroup] = useState("environment");

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, itemsPerPage]);

  const fetchData = async (page) => {
    setLoading(true);
    setError(null);

    try {
      const result = await historyService.getHistoryData({ page, limit: itemsPerPage });
      setData(result.data || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err.message);
      if (String(err.message).includes('Unauthorized')) {
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const aggregateParams = useMemo(() => ({
    page: 1,
    limit: 100,
    periodType: "day",
  }), []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col">
      <Navbar />

      <main className="pt-32 pb-20 px-4 flex-grow relative">
        <div className="container mx-auto max-w-7xl">
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-border/50">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
              Lịch Sử Dữ Liệu <span className="text-primary">Cảm Biến</span>
            </h1>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <p className="text-muted-foreground">
                Tổng số: <span className="text-primary font-semibold">{total}</span> bản ghi
              </p>
              
              <div className="flex items-center gap-2">
                <label htmlFor="itemsPerPage" className="text-sm text-muted-foreground">
                  Hiển thị:
                </label>
                <select
                  id="itemsPerPage"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="px-3 py-2 rounded-lg bg-background border border-border text-foreground cursor-pointer hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-muted-foreground">/ trang</span>
              </div>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-4 rounded-lg mb-6">
                <p className="font-semibold">Lỗi: {error}</p>
                {error.includes('Unauthorized') && (
                  <p className="text-sm mt-2">Đang chuyển đến trang đăng nhập...</p>
                )}
              </div>
            )}

            {!loading && !error && data.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-xl">Không có dữ liệu</p>
              </div>
            )}

            {!loading && !error && data.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-semibold">#</th>
                        <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                        <th className="px-4 py-3 text-right font-semibold">Nhiệt độ (°C)</th>
                        <th className="px-4 py-3 text-right font-semibold">Độ ẩm (%)</th>
                        <th className="px-4 py-3 text-right font-semibold">Lux</th>
                        <th className="px-4 py-3 text-right font-semibold">UVI</th>
                        <th className="px-4 py-3 text-right font-semibold">UVA</th>
                        <th className="px-4 py-3 text-right font-semibold">UVB</th>
                        <th className="px-4 py-3 text-right font-semibold">Broadband</th>
                        <th className="px-4 py-3 text-right font-semibold">Infrared</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((item, index) => (
                        <tr 
                          key={item._id} 
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.temperature?.toFixed(1) || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.humidity?.toFixed(1) || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.lux || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.UVI?.toFixed(2) || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.UVA?.toFixed(2) || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.UVB?.toFixed(2) || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.broadband || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {item.infrared || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Trước
                  </button>

                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageClick(page)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sau →
                  </button>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-4">
                  Trang {currentPage} / {totalPages}
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
