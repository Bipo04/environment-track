import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { LivePage } from "./pages/LivePage";
import { ChartPage } from "./pages/ChartPage";
import { LoginPage } from "./pages/LoginPage";
import { PrivatePage } from "./pages/PrivatePage";
import { NotFound } from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/private" 
            element={
              <ProtectedRoute>
                <PrivatePage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
