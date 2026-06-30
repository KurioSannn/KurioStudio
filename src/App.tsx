import React, { lazy, Suspense } from "react";
import { RouteProvider, useRoute } from "./context/RouteContext";
import { AppShell } from "./components/layout/app-shell";
import { AppRoute } from "./lib/types";
import { trackEvent } from "./lib/analytics";
import { updateRouteMeta } from "./lib/route-meta";

// Homepage Sections
import { HeroSection } from "./components/home/hero-section";
import { QuickDropZone } from "./components/home/quick-drop-zone";
import { ToolCategoryGrid } from "./components/home/tool-category-grid";
import { FeaturedTools } from "./components/home/featured-tools";
import { HowItWorks } from "./components/home/how-it-works";
import { AIHelperPreview } from "./components/home/ai-helper-preview";

const ToolsDirectory = lazy(() => import("./pages/ToolsDirectory"));
const PDFToPNG = lazy(() => import("./pages/PDFToPNG"));
const ImageToPDF = lazy(() => import("./pages/ImageToPDF"));
const MergePDF = lazy(() => import("./pages/MergePDF"));
const ResizePDF = lazy(() => import("./pages/ResizePDF"));
const PDFCompressor = lazy(() => import("./pages/PDFCompressor"));
const DocToMarkdown = lazy(() => import("./pages/DocToMarkdown"));
const CompressImage = lazy(() => import("./pages/CompressImage"));
const ResizeImage = lazy(() => import("./pages/ResizeImage"));
const LottiePreview = lazy(() => import("./pages/LottiePreview"));
const JSONFormatter = lazy(() => import("./pages/JSONFormatter"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));
const AIHelperPage = lazy(() => import("./pages/AIHelperPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));

function RouteLoading() {
  return (
    <div className="mx-auto flex min-h-[420px] max-w-7xl items-center justify-center px-6" aria-label="Loading page">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-border border-t-accent-secondary" />
    </div>
  );
}

function MainAppRouter() {
  const { route } = useRoute();

  React.useEffect(() => {
    updateRouteMeta(route);
    trackEvent("page_view", { route });
  }, [route]);

  // Render the view that matches the current app route.
  const renderRouteView = () => {
    const routePath = route.split("?")[0] as AppRoute;

    switch (routePath) {
      case "/":
        return (
          <div className="animate-fade-in">
            <HeroSection />
            
            {/* Quick action drop zones panel */}
            <div className="bg-brand-secondary border-b border-brand-border py-4.5">
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
      
      case "/tools/image-to-pdf":
      case "/tools/pdf-to-jpg":
        return <ImageToPDF />;

      case "/tools/pdf-merge":
        return <MergePDF />;

      case "/tools/resize-pdf":
        return <ResizePDF />;

      case "/tools/pdf-compressor":
        return <PDFCompressor />;

      case "/tools/doc-to-md":
        return <DocToMarkdown />;
      
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

      case "/privacy":
        return <PrivacyPage />;

      case "/terms":
        return <TermsPage />;

      case "/contact":
        return <ContactPage />;
      
      default:
        // Fail-safe router backstop
        return <ToolsDirectory />;
    }
  };

  return (
    <AppShell>
      <Suspense fallback={<RouteLoading />}>{renderRouteView()}</Suspense>
    </AppShell>
  );
}

export function App() {
  return (
    <RouteProvider>
      <MainAppRouter />
    </RouteProvider>
  );
}

export default App;
