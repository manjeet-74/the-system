import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#04070d] flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-[#ff4d5e] font-rajdhani text-4xl font-bold tracking-widest">
              SYSTEM ERROR
            </div>
            <p className="text-[#6d81a0] font-rajdhani text-sm">
              Something went wrong. Reload the page to try again.
            </p>
            {this.state.message && (
              <p className="text-[#ff4d5e]/60 font-mono text-xs bg-[#ff4d5e]/5 border border-[#ff4d5e]/20 p-3 rounded">
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-semibold px-6 py-2 rounded transition-colors cursor-pointer"
            >
              RELOAD
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
