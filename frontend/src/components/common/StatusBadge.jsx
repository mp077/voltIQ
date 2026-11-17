import React from 'react'

const STATUS_CONFIG = {
  // Alert / Anomaly status
  open: { label: 'Open', className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30' },
  acknowledged: { label: 'Acknowledged', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },

  // Severity
  low: { label: 'Low', className: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  high: { label: 'High', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
  critical: { label: 'Critical', className: 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold' },

  // Meter status
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  inactive: { label: 'Inactive', className: 'bg-slate-700/50 text-slate-400 border border-slate-700' },
  faulty: { label: 'Faulty', className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30' },

  // Maintenance status
  pending: { label: 'Pending', className: 'bg-slate-700/50 text-slate-400 border border-slate-700' },
  assigned: { label: 'Assigned', className: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },

  // DR status
  accepted: { label: 'Accepted', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  rejected: { label: 'Rejected', className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30' },

  // Anomaly
  anomaly: { label: 'Anomaly', className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30' },
  normal: { label: 'Normal', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },

  // User roles
  admin: { label: 'Admin', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  facility_manager: { label: 'Facility Mgr', className: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' },
  consumer: { label: 'Consumer', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  technician: { label: 'Technician', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
}

const StatusBadge = ({ status, label, size = 'sm' }) => {
  const config = STATUS_CONFIG[status?.toLowerCase()] || {
    label: status || 'Unknown',
    className: 'bg-slate-800 text-slate-400 border border-slate-700'
  }
  const displayLabel = label || config.label
  const sizeClass = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5'

  return (
    <span className={`inline-flex items-center font-mono font-semibold rounded-md whitespace-nowrap ${sizeClass} ${config.className}`}>
      {displayLabel}
    </span>
  )
}

export default StatusBadge
