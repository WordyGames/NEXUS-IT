import React, { Component, ReactNode } from 'react';
import { logRuntimeError } from '@nexus-it/shared';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Error desconocido'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logRuntimeError('desktop', 'Error fatal en render', error, {
      componentStack: errorInfo.componentStack
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            padding: 24
          }}
        >
          <div
            style={{
              maxWidth: 560,
              width: '100%',
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              padding: 24
            }}
          >
            <h1 style={{ margin: '0 0 8px', color: '#991b1b', fontSize: 24 }}>Algo salió mal</h1>
            <p style={{ margin: '0 0 16px', color: '#374151' }}>
              La aplicación encontró un error inesperado. Puedes recargar para continuar.
            </p>

            <pre
              style={{
                margin: 0,
                maxHeight: 220,
                overflow: 'auto',
                background: '#fee2e2',
                color: '#7f1d1d',
                borderRadius: 8,
                padding: 12,
                fontSize: 12
              }}
            >
              {this.state.errorMessage}
            </pre>

            <button
              onClick={this.handleReload}
              style={{
                marginTop: 16,
                border: 0,
                borderRadius: 8,
                background: '#1d4ed8',
                color: '#fff',
                padding: '10px 16px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              type="button"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
