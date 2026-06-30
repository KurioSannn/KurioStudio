import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "../ui/button";
import { useLanguage } from "@/src/context/LanguageContext";
import type { TranslationKeys } from "@/src/lib/i18n";

interface Props {
  children: ReactNode;
  fallbackRoute?: () => void;
  t: TranslationKeys;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Kurio Studio caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.fallbackRoute) {
      this.props.fallbackRoute();
    } else {
      window.location.href = "/";
    }
  };

  public render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-8 max-w-md shadow-sm space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertCircle className="h-7 w-7" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-text-primary">{t.errorTitle}</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t.errorDesc}
              </p>
            </div>

            {this.state.error && (
              <div className="bg-brand-secondary border border-brand-border rounded-lg p-3 text-left overflow-auto max-h-32">
                <code className="text-[10px] text-text-muted font-mono whitespace-pre-wrap">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.location.reload()} variant="primary" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t.errorReload}
              </Button>
              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                {t.errorHome}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: Omit<Props, "t">) {
  const { t } = useLanguage();
  return <ErrorBoundaryInner {...props} t={t} />;
}
