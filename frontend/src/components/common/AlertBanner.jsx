import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

const TYPES = {
  info: { icon: Info, className: 'bg-cyan-950/40 border-cyan-800/60 text-cyan-200', iconClass: 'text-cyan-400' },
  success: { icon: CheckCircle, className: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200', iconClass: 'text-emerald-400' },
  warning: { icon: AlertTriangle, className: 'bg-amber-950/40 border-amber-800/60 text-amber-200', iconClass: 'text-amber-400' },
  error: { icon: AlertCircle, className: 'bg-rose-950/40 border-rose-800/60 text-rose-200', iconClass: 'text-rose-400' },
}

const AlertBanner = ({ type = 'info', message, onClose }) => {
  if (!message) return null
  const { icon: Icon, className, iconClass } = TYPES[type] || TYPES.info

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${className} mb-4 text-xs font-mono`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
      <p className="flex-1 font-medium">{message}</p>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 opacity-70 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default AlertBanner
