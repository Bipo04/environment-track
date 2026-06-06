import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
// import { LivePage } from "./pages/LivePage";
// import { ChartPage } from "./pages/ChartPage";
import { LoginPage } from "./pages/LoginPage";
import { HistoryPage } from "./pages/HistoryPageEnhanced";
import { DashboardPage } from "./pages/DashboardPage";
import { NotFound } from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

function App() {
  return (
    <WebSocketProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          {/* <Route path="/live" element={<LivePage />} /> */}
          <Route path="/live" element={<DashboardPage />} />
          {/* <Route path="/chart" element={<ChartPage />} /> */}
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </WebSocketProvider>
  );
}

export default App;
