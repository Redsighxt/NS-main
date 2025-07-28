import "./global.css";

import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DrawingProvider } from "./contexts/DrawingContext";
import { AnimationProvider } from "./contexts/AnimationContext";
import { LibraryProvider } from "./contexts/LibraryContext";
import { FloatingPanelProvider } from "./contexts/FloatingPanelContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CanvasBackgroundProvider } from "./contexts/CanvasBackgroundContext";
import { CanvasSettingsProvider } from "./contexts/CanvasSettingsContext";
import { VirtualPagesProvider } from "./contexts/VirtualPagesContext";
import { PageModeProvider } from "./contexts/PageModeContext";
import { UIVisibilityProvider } from "./contexts/UIVisibilityContext";
import { WelcomeProvider } from "./contexts/WelcomeContext";
import { StylusOnlyProvider } from "./contexts/StylusOnlyContext";
import { TextToolProvider } from "./contexts/TextToolContext";
import { MusicProvider } from "./contexts/MusicContext";

// Lazy load pages for better performance
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">
        Loading RexSight Studio...
      </p>
    </div>
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error }>;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error }>;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error || new Error("Unknown error")}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="text-center space-y-4 p-8">
      <h2 className="text-lg font-semibold text-destructive">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        We're sorry, but there was an error loading the application. Please
        refresh the page to try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Refresh Page
      </button>
      {process.env.NODE_ENV === "development" && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Error Details
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-w-md">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <DrawingProvider>
          <AnimationProvider>
            <LibraryProvider>
              <FloatingPanelProvider>
                <CanvasBackgroundProvider>
                  <CanvasSettingsProvider>
                    <VirtualPagesProvider>
                      <PageModeProvider>
                        <UIVisibilityProvider>
                          <StylusOnlyProvider>
                            <TextToolProvider>
                              <MusicProvider>
                                <WelcomeProvider>
                                  <Toaster />
                                  <Sonner />
                                  <BrowserRouter>
                                    <ErrorBoundary fallback={ErrorFallback}>
                                      <Suspense fallback={<LoadingSpinner />}>
                                        <Routes>
                                          <Route path="/" element={<Index />} />
                                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                                          <Route
                                            path="*"
                                            element={<NotFound />}
                                          />
                                        </Routes>
                                      </Suspense>
                                    </ErrorBoundary>
                                  </BrowserRouter>
                                </WelcomeProvider>
                              </MusicProvider>
                            </TextToolProvider>
                          </StylusOnlyProvider>
                        </UIVisibilityProvider>
                      </PageModeProvider>
                    </VirtualPagesProvider>
                  </CanvasSettingsProvider>
                </CanvasBackgroundProvider>
              </FloatingPanelProvider>
            </LibraryProvider>
          </AnimationProvider>
        </DrawingProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

// Ensure root is only created once (prevents HMR duplicate root warnings)
// Only execute in browser environment, not during build
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const rootElement = document.getElementById("root")!;
  let root = (globalThis as any).__reactRoot;

  if (!root) {
    root = createRoot(rootElement);
    (globalThis as any).__reactRoot = root;
  }

  root.render(<App />);
}
