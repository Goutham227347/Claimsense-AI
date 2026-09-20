import { Component, ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ClaimSense ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
          <div className="text-[0.65rem] uppercase tracking-wider text-destructive font-mono-archive">
            System Error
          </div>
          <h2 className="font-serif-display text-2xl text-foreground">
            An unexpected error occurred.
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            {this.state.message || "The workspace encountered an unrecoverable fault. Please reset to continue."}
          </p>
          <button
            onClick={this.reset}
            className="text-xs font-mono-archive uppercase tracking-wider border border-border px-4 py-2 rounded-sm hover:border-foreground hover:bg-secondary transition-colors"
          >
            Reset Workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
