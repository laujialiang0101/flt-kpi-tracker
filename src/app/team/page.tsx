'use client'

import { useState } from 'react'
import { Users, TrendingUp, Target, CheckCircle } from 'lucide-react'

// Demo data
const demoTeamData = {
  outlet_id: 'FLT001',
  outlet_name: 'Farmasi Lautan Kuala Terengganu',
  period: 'December 2024',
  summary: {
    total_sales: 245680.50,
    target: 280000,
    house_brand: 28450.00,
    transactions: 1842,
    staff_count: 12
  },
  staff: [
    { id: 'SM023', name: 'Muhammad Hafiz', sales: 62380, house_brand: 7890, transactions: 156, compliance: 95, rank: 1 },
    { id: 'SM001', name: 'Ahmad Razak', sales: 58920, house_brand: 6450, transactions: 142, compliance: 88, rank: 2 },
    { id: 'SM056', name: 'Rizal Hassan', sales: 46780, house_brand: 4560, transactions: 128, compliance: 92, rank: 3 },
    { id: 'SM034', name: 'Faizal Rahman', sales: 38450, house_brand: 3890, transactions: 98, compliance: 85, rank: 4 },
    { id: 'SM078', name: 'Nurul Huda', sales: 32150, house_brand: 3210, transactions: 87, compliance: 90, rank: 5 },
    { id: 'SM089', name: 'Aishah Zainal', sales: 28900, house_brand: 2890, transactions: 76, compliance: 78, rank: 6 },
  ]
}

export default function TeamPage() {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

  const formatRM = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 80) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const achievement = Math.round((demoTeamData.summary.total_sales / demoTeamData.summary.target) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
        <p className="text-gray-500 mt-1">
          {demoTeamData.outlet_name} | {demoTeamData.period}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatRM(demoTeamData.summary.total_sales)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Target: {formatRM(demoTeamData.summary.target)}</span>
              <span className={`font-medium ${achievement >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                {achievement}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min(achievement, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">House Brand</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatRM(demoTeamData.summary.house_brand)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {Math.round((demoTeamData.summary.house_brand / demoTeamData.summary.total_sales) * 100)}% of total
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {demoTeamData.summary.transactions.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            ~{Math.round(demoTeamData.summary.transactions / demoTeamData.summary.staff_count)} per staff
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Team Size</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {demoTeamData.summary.staff_count}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Active staff members
          </p>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Staff</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Sales</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">House Brand</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Trans.</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Compliance</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {demoTeamData.staff.map((staff) => (
                <tr
                  key={staff.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-medium ${
                      staff.rank <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {staff.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium text-gray-900">{staff.name}</span>
                      <p className="text-xs text-gray-500">{staff.id}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {formatRM(staff.sales)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatRM(staff.house_brand)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {staff.transactions}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplianceColor(staff.compliance)}`}>
                      {staff.compliance}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedStaff(staff.id)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      View Details
                    </button>
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
