'use client'

import { useState } from 'react'
import { Trophy, Medal, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react'

// Demo data
const demoLeaderboard = [
  { rank: 1, staff_id: 'SM045', name: 'Siti Aminah', outlet: 'FLT003', sales: 68450.00, house_brand: 8540.00, trend: 12.5 },
  { rank: 2, staff_id: 'SM023', name: 'Muhammad Hafiz', outlet: 'FLT001', sales: 62380.00, house_brand: 7890.00, trend: 8.2 },
  { rank: 3, staff_id: 'SM001', name: 'Ahmad Razak', outlet: 'FLT001', sales: 58920.00, house_brand: 6450.00, trend: 5.1, isCurrentUser: true },
  { rank: 4, staff_id: 'SM078', name: 'Nurul Huda', outlet: 'FLT005', sales: 54670.00, house_brand: 5890.00, trend: -2.3 },
  { rank: 5, staff_id: 'SM034', name: 'Faizal Rahman', outlet: 'FLT002', sales: 51230.00, house_brand: 5120.00, trend: 3.8 },
  { rank: 6, staff_id: 'SM089', name: 'Aishah Zainal', outlet: 'FLT004', sales: 48900.00, house_brand: 4780.00, trend: 1.2 },
  { rank: 7, staff_id: 'SM056', name: 'Rizal Hassan', outlet: 'FLT001', sales: 46780.00, house_brand: 4560.00, trend: -1.5 },
  { rank: 8, staff_id: 'SM012', name: 'Zainab Othman', outlet: 'FLT006', sales: 44560.00, house_brand: 4230.00, trend: 4.7 },
  { rank: 9, staff_id: 'SM067', name: 'Kamal Idris', outlet: 'FLT003', sales: 42340.00, house_brand: 3890.00, trend: 2.1 },
  { rank: 10, staff_id: 'SM098', name: 'Mariam Yusof', outlet: 'FLT002', sales: 40120.00, house_brand: 3670.00, trend: -0.8 },
]

export default function Leaderboard() {
  const [scope, setScope] = useState<'outlet' | 'company'>('outlet')
  const [metric, setMetric] = useState<'sales' | 'house_brand'>('sales')

  const formatRM = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />
    return <span className="w-5 h-5 flex items-center justify-center text-gray-500 font-medium">{rank}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-500 mt-1">December 2024 Rankings</p>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScope('outlet')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scope === 'outlet'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Outlet
            </button>
            <button
              onClick={() => setScope('company')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scope === 'company'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Company
            </button>
          </div>

          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as 'sales' | 'house_brand')}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="sales">Total Sales</option>
            <option value="house_brand">House Brand</option>
          </select>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4">
        {demoLeaderboard.slice(0, 3).map((staff, index) => (
          <div
            key={staff.staff_id}
            className={`card text-center ${
              index === 0 ? 'ring-2 ring-yellow-400 bg-gradient-to-b from-yellow-50' :
              index === 1 ? 'ring-2 ring-gray-300 bg-gradient-to-b from-gray-50' :
              'ring-2 ring-orange-300 bg-gradient-to-b from-orange-50'
            } ${staff.isCurrentUser ? 'border-2 border-primary-500' : ''}`}
          >
            <div className="flex justify-center mb-3">
              {getRankBadge(staff.rank)}
            </div>
            <h3 className="font-semibold text-gray-900">{staff.name}</h3>
            <p className="text-sm text-gray-500">{staff.outlet}</p>
            <p className="text-2xl font-bold text-gray-900 mt-3">
              {formatRM(metric === 'sales' ? staff.sales : staff.house_brand)}
            </p>
            <div className={`flex items-center justify-center mt-2 text-sm ${
              staff.trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {staff.trend >= 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {Math.abs(staff.trend)}%
            </div>
            {staff.isCurrentUser && (
              <span className="badge-success mt-2">You</span>
            )}
          </div>
        ))}
      </div>

      {/* Full Rankings Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Full Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Staff</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Outlet</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total Sales</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">House Brand</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Trend</th>
              </tr>
            </thead>
            <tbody>
              {demoLeaderboard.map((staff) => (
                <tr
                  key={staff.staff_id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    staff.isCurrentUser ? 'bg-primary-50' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      {getRankBadge(staff.rank)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{staff.name}</span>
                      {staff.isCurrentUser && (
                        <span className="badge-success ml-2">You</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{staff.staff_id}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{staff.outlet}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {formatRM(staff.sales)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatRM(staff.house_brand)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`flex items-center justify-end ${
                      staff.trend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {staff.trend >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                      {Math.abs(staff.trend)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
