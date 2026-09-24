/**
 * Root error boundary.
 *
 * Without one, a single component throwing anywhere in the tree unmounts the
 * entire application and leaves a blank page - which is exactly the failure
 * that hid a one-line bug in ScrollToTop. A blank screen tells a user nothing
 * and tells a developer nothing either.
 *
 * So the boundary reports what broke, keeps the error text visible for copying,
 * and offers a way back rather than a dead end. On a demonstration machine,
 * recovering from one broken panel matters more than being strictly correct.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? '' });
    // Keep the original in the console for anyone with DevTools open.
    console.error('MathXplore caught an error:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null, componentStack: '' });
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    const broke = componentStack
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('at '));

    return (
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <div className="panel p-6">
          <div className="eyebrow mb-2 text-danger">Something broke</div>
          <h1 className="text-[22px] font-semibold tracking-tight text-paper">
            A part of MathXplore stopped working
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
            The rest of the platform is fine. Going back to the start usually clears it — and if it
            keeps happening, the details below are what a developer needs.
          </p>

          <div className="mt-4 overflow-hidden rounded-lg border border-danger/30 bg-danger/8">
            <div className="border-b border-danger/20 px-3 py-1.5">
              <span className="eyebrow text-danger">{error.name}</span>
            </div>
            <pre className="code-surface overflow-x-auto px-3 py-2.5 text-[12px] whitespace-pre-wrap text-paper/90">
              {error.message}
            </pre>
            {broke && (
              <div className="border-t border-danger/20 px-3 py-1.5 font-mono text-[11px] text-faint">
                {broke}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => {
                window.location.hash = '#/';
                this.reset();
              }}
              className="btn btn-primary"
            >
              Back to the start
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-ghost">
              Reload the page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
