import React from 'react'
import { Inbox } from 'lucide-react'

const EmptyState = ({ message = 'No data available', icon: Icon = Inbox, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl mb-3 text-slate-400">
        <Icon className="w-6 h-6 text-amber-400/80" />
      </div>
      <p className="text-slate-400 text-sm font-medium">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export default EmptyState
