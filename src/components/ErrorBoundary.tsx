import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Try to parse the error message if it's our custom JSON error
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.error) {
        this.setState({ errorInfo: parsed.error });
      }
    } catch (e) {
      // Not a JSON error, ignore
    }
  }

  private handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
    event.preventDefault();
    const error = 'error' in event ? event.error : event.reason;
    
    this.setState({ hasError: true, error });
    
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.error) {
        this.setState({ errorInfo: parsed.error });
      }
    } catch (e) {
      // Not a JSON error, ignore
    }
  };

  public componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleGlobalError);
  }

  public componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleGlobalError);
  }

  public render() {
    if (this.state.hasError) {
      const isPermissionError = this.state.error?.message.includes('permission-denied') || 
                                this.state.errorInfo?.includes('permission-denied') ||
                                this.state.error?.message.includes('Missing or insufficient permissions');
                                
      const isOfflineError = this.state.error?.message.includes('client is offline') || 
                             this.state.errorInfo?.includes('client is offline') ||
                             this.state.error?.message.includes('offline');

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-8 text-center border border-slate-200">
            <div className={`w-16 h-16 ${isOfflineError ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <ShieldAlert size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isPermissionError ? 'Acesso Negado' : isOfflineError ? 'Você está offline' : 'Ops! Algo deu errado'}
            </h1>
            
            <p className="text-slate-600 mb-6">
              {isPermissionError 
                ? 'Você não tem permissão para acessar ou modificar estes dados. Verifique se você está logado com a conta correta ou se as regras de segurança do banco de dados permitem esta ação.'
                : isOfflineError
                ? 'Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet e tente novamente.'
                : 'Ocorreu um erro inesperado no aplicativo. Nossa equipe já foi notificada.'}
            </p>

            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors w-full"
              >
                <RefreshCw size={18} />
                Recarregar Aplicativo
              </button>

              <button 
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-xs text-slate-400 hover:text-slate-600 underline block mx-auto"
              >
                {this.state.showDetails ? 'Ocultar Detalhes' : 'Ver Detalhes do Erro'}
              </button>
            </div>

            {this.state.showDetails && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left overflow-auto max-h-64">
                <p className="text-xs font-mono text-rose-600 mb-2 font-bold">
                  {this.state.error?.name}: {this.state.error?.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap">
                    {this.state.errorInfo}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
