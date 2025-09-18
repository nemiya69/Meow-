import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="space-y-4">
              <h1 className="font-romantic text-4xl text-heart">💔</h1>
              <h2 className="font-sweet text-xl text-foreground">
                Oops! Something went wrong
              </h2>
              <p className="font-sweet text-muted-foreground">
                Don't worry, we can try to fix this together!
              </p>
            </div>
            <Button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="font-sweet"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;