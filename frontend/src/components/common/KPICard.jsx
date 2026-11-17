import React from 'react'

const KPICard = ({ title, value, unit, icon: Icon, color = 'amber', trend, trendLabel, loading }) => {
  const colorMap = {
    amber: {
      bg: 'bg-amber-500/10',
      icon: 'text-amber-400',
      border: 'border-amber-500/20',
      trend: 'text-amber-400',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      icon: 'text-cyan-400',
      border: 'border-cyan-500/20',
      trend: 'text-cyan-400',
    },
    green: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      border: 'border-emerald-500/20',
      trend: 'text-emerald-400',
    },
    red: {
      bg: 'bg-rose-500/10',
      icon: 'text-rose-400',
      border: 'border-rose-500/20',
      trend: 'text-rose-400',
    },
    purple: {
      bg: 'bg-violet-500/10',
      icon: 'text-violet-400',
      border: 'border-violet-500/20',
      trend: 'text-violet-400',
    },
    blue: {
      bg: 'bg-sky-500/10',
      icon: 'text-sky-400',
      border: 'border-sky-500/20',
      trend: 'text-sky-400',
    },
  }

  const colors = colorMap[color] || colorMap.amber

  if (loading) {
    return (
      <div className="bg-[#131B2E] rounded-2xl border border-slate-800/80 p-5 animate-pulse">
        <div className="h-3 bg-slate-800 rounded w-20 mb-3"></div>
        <div className="h-7 bg-slate-800 rounded w-28 mb-2"></div>
        <div className="h-3 bg-slate-800 rounded w-16"></div>
      </div>
    )
  }

  return (
    <div className="bg-[#131B2E] rounded-2xl border border-slate-800/80 p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-black text-white font-mono tracking-tight truncate">
              {value !== undefined && value !== null ? value : '—'}
            </span>
            {unit && <span className="text-xs font-semibold text-slate-400 font-mono">{unit}</span>}
          </div>
          {trendLabel && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-mono">
              {trend && (
                <span className={`font-bold ${colors.trend}`}>
                  {trend}
                </span>
              )}
              <span className="text-slate-400">{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${colors.bg} p-2.5 rounded-xl border ${colors.border} flex-shrink-0 ml-3`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
        )}
      </div>
    </div>
  )
}

export default KPICard
