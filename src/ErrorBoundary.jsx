import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash Detected:", error, errorInfo);
  }

  handleRestart = () => {
    localStorage.clear(); // Clear all potential corrupt data
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center p-10 text-white font-sans text-center z-[9999]">
          <div className="max-w-md space-y-8 animate-in zoom-in-95 duration-500">
            <div className="p-8 bg-rose-600/10 rounded-[40px] border border-rose-500/20 shadow-2xl inline-block">
               <svg size={60} className="text-rose-400 mx-auto" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                 <line x1="12" y1="9" x2="12" y2="13"/>
                 <line x1="12" y1="17" x2="12.01" y2="17"/>
               </svg>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-black italic tracking-tighter">APPLICATION ERROR</h1>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                We encountered a technical issue while rendering the dashboard. This happens sometimes due to stale cache or network sync errors.
              </p>
              <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-700/50 text-left font-mono text-[10px] text-rose-300 overflow-auto max-h-32">
                {this.state.error?.toString()}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                Quick Refresh
              </button>
              <button 
                onClick={this.handleRestart}
                className="w-full py-4 rounded-3xl bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 hover:text-white transition-all active:scale-95"
              >
                Clear Data & Force Restart
              </button>
            </div>
            
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Premium Recovery System v1.1.0</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
