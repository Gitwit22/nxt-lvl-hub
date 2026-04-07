import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProgramProvider } from "@/context/ProgramContext";
import { AppLayout } from "@/components/AppLayout";
import HomePage from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import ApplicationsPage from "@/pages/ApplicationsPage";
import ProgramDetailPage from "@/pages/ProgramDetailPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProgramProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/applications/:id" element={<ProgramDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </ProgramProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
