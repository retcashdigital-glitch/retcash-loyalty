'use client'

import { LucideIcon } from 'lucide-react'

export type Tab = 'billing' | 'offers' | 'customers'

interface TabItem {
  id: Tab
  label: string
  icon: LucideIcon
}

interface NavigationTabsProps {
  tabs: TabItem[]
  activeTab: Tab
  onSelectTab: (tab: Tab) => void
}

export default function NavigationTabs({ tabs, activeTab, onSelectTab }: NavigationTabsProps) {
  return (
    <nav aria-label="Merchant dashboard sections" className="mb-6 border-b border-slate-200">
      <div className="grid grid-cols-3 gap-1" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`${id}-tab`}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => onSelectTab(id)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 px-1 py-2 text-center text-[10px] font-bold leading-tight transition cursor-pointer sm:min-h-12 sm:flex-row sm:gap-2 sm:px-5 sm:py-3 sm:text-xs ${
              activeTab === id 
                ? 'border-[#00875A] text-[#00875A] bg-emerald-50/80' 
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            type="button"
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}