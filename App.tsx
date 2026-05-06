import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AnalyzePage from "./pages/AnalyzePage.tsx";
import TradePage from "./pages/TradePage.tsx";
import CompetePage from "./pages/CompetePage.tsx";
import ClubDetailPage from "./pages/ClubDetailPage.tsx";
import UserPortfolioPage from "./pages/UserPortfolioPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import PricingPage from "./pages/PricingPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import Navbar from "./components/Navbar.tsx";
import InvestmentChatbot from "./components/InvestmentChatbot.tsx";

const queryClient = new QueryClient();

const PageWithNav = ({ children }: { children: React.ReactNode }) => (
  <>
    <Navbar />
    {children}
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/analyze" element={<PageWithNav><AnalyzePage /></PageWithNav>} />
          <Route path="/trade" element={<PageWithNav><TradePage /></PageWithNav>} />
          <Route path="/compete" element={<PageWithNav><CompetePage /></PageWithNav>} />
          <Route path="/compete/:clubId" element={<PageWithNav><ClubDetailPage /></PageWithNav>} />
          <Route path="/users/:userId" element={<PageWithNav><UserPortfolioPage /></PageWithNav>} />
          <Route path="/pricing" element={<PageWithNav><PricingPage /></PageWithNav>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <InvestmentChatbot />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
