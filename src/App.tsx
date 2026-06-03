import React from "react";
import { RouteProvider, useRoute } from "./context/RouteContext";
import { AppShell } from "./components/layout/app-shell";

// Homepage Sections
import { HeroSection } from "./components/home/hero-section";
import { QuickDropZone } from "./components/home/quick-drop-zone";
import { ToolCategoryGrid } from "./components/home/tool-category-grid";
import { FeaturedTools } from "./components/home/featured-tools";
import { HowItWorks } from "./components/home/how-it-works";
import { AIHelperPreview } from "./components/home/ai-helper-preview";

// System Pages
import { ToolsDirectory } from "./pages/ToolsDirectory";
import { PDFToPNG } from "./pages/PDFToPNG";
import { CompressImage } from "./pages/CompressImage";
import { ResizeImage } from "./pages/ResizeImage";
import { LottiePreview } from "./pages/LottiePreview";
import { JSONFormatter } from "./pages/JSONFormatter";
import { WorkspacePage } from "./pages/WorkspacePage";
import { AIHelperPage } from "./pages/AIHelperPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ComingSoon } from "./pages/ComingSoon";

function MainAppRouter() {
  const { route } = useRoute();

  // Conditional rendering based on localized state hashes
  const renderRouteView = () => {
    switch (route) {
      case "/":
        return (
          <div className="space-y-4 animate-fade-in">
            <HeroSection />
            
            {/* Quick action drop zones panel */}
            <div className="bg-[#FAFAF7] border-b border-brand-border py-4.5">
              <QuickDropZone />
            </div>

            <ToolCategoryGrid />
            <HowItWorks />
            <FeaturedTools />
            <AIHelperPreview />
          </div>
        );
      
      case "/tools":
        return <ToolsDirectory />;
      
      case "/tools/pdf-to-png":
        return <PDFToPNG />;
      
      case "/tools/pdf-to-jpg":
        return <ComingSoon toolName="PDF to JPG Converter" />;
      
      case "/tools/remove-bg":
        return <ComingSoon toolName="Background Remover" />;
      
      case "/tools/compress-image":
        return <CompressImage />;
      
      case "/tools/resize-image":
        return <ResizeImage />;
      
      case "/tools/lottie-preview":
        return <LottiePreview />;
      
      case "/tools/lottie-to-mp4":
        return <ComingSoon toolName="Lottie to MP4 Animation Renderer" />;
      
      case "/tools/json-formatter":
        return <JSONFormatter />;
      
      case "/workspace":
        return <WorkspacePage />;
      
      case "/ai-helper":
        return <AIHelperPage />;
      
      case "/settings":
        return <SettingsPage />;
      
      default:
        // Fail-safe router backstop
        return <ToolsDirectory />;
    }
  };

  return <AppShell>{renderRouteView()}</AppShell>;
}

export function App() {
  return (
    <RouteProvider>
      <MainAppRouter />
    </RouteProvider>
  );
}

export default App;
