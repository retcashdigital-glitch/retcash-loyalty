'use client'

import { Search } from 'lucide-react'

interface CashbackClaim {
  id: string
  customer_phone: string
  claimable_amount: number
  visit_count: number
  status: string
}

interface CustomersSectionProps {
  filteredCustomers: CashbackClaim[]
  customerSearchQuery: string
  setCustomerSearchQuery: (val: string) => void
  targetVisits: number
}

export default function CustomersSection({
  filteredCustomers,
  customerSearchQuery,
  setCustomerSearchQuery,
  targetVisits
}: CustomersSectionProps) {
  return (
    <section className="max-w-3xl">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Customers directory</h2>
            <p className="mt-1 text-xs text-slate-500">Your most recent customer activity.</p>
          </div>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 font-mono text-[10px] text-slate-600 font-bold">
            {filteredCustomers.length} customers
          </span>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={customerSearchQuery}
            onChange={(e) => setCustomerSearchQuery(e.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#00875A] focus:bg-white font-mono"
            placeholder="Search customer by phone number..."
          />
        </div>

        <div className="space-y-3">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((cust) => (
              <div key={cust.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-mono text-sm font-black text-slate-900">{cust.customer_phone}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Visits: <strong className="font-extrabold text-slate-900">{cust.visit_count} / {targetVisits}</strong></span>
                    <span>Cashback: <strong className="font-extrabold text-slate-900">Rs. {cust.claimable_amount}</strong></span>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-wider sm:self-auto ${
                  cust.status === 'REDEEMED' ? 'border-slate-300 bg-slate-200 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-[#00875A]'
                }`}>
                  <span className={`size-1.5 rounded-full ${cust.status === 'REDEEMED' ? 'bg-slate-400' : 'bg-[#00875A]'}`} />
                  {cust.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">No matching customers found.</p>
          )}
        </div>
      </div>
    </section>
  )
}