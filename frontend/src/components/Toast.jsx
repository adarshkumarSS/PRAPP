import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const icons = {
    success: <CheckCircle2 size={18} color="#16a34a" />,
    error: <AlertCircle size={18} color="#dc2626" />,
    info: <Info size={18} color="#2563eb" />
  };

  return (
    <div className={`toast toast-${toast.type || 'info'}`}>
      {icons[toast.type] || icons.info}
      <div style={{ flex: 1, fontSize: '0.88rem', color: '#0f172a' }}>{toast.message}</div>
      <button onClick={onDismiss} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
        <X size={14} />
      </button>
    </div>
  );
}
