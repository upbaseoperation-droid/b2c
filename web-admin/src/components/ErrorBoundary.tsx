'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-xl bg-surface border border-line shadow-sm max-w-2xl mx-auto my-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-ink">
              {this.props.fallbackTitle || 'Không thể hiển thị màn hình này'}
            </h2>
            <p className="text-xs text-ink-2 max-w-md mx-auto leading-relaxed">
              Đã xảy ra lỗi trong quá trình kết xuất dữ liệu của màn hình. Các phân hệ khác vẫn hoạt động bình thường.
            </p>
          </div>

          {this.state.error && (
            <div className="text-left bg-sunken p-3 rounded-lg border border-line text-2xs font-mono text-ink-3 max-h-32 overflow-y-auto">
              <span className="font-semibold text-critical">Lỗi: </span>
              {this.state.error.message || 'Lỗi không xác định'}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Thử tải lại
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-white text-slate-700 border border-line hover:bg-sunken transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
