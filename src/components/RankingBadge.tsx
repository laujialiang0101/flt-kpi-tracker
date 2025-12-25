'use client'

import { Trophy, Medal } from 'lucide-react'

interface RankingBadgeProps {
  outletRank: number
  outletTotal: number
  companyRank: number
  companyTotal: number
}

export default function RankingBadge({
  outletRank,
  outletTotal,
  companyRank,
  companyTotal
}: RankingBadgeProps) {
  const getRankColor = (rank: number, total: number) => {
    const percentile = (1 - rank / total) * 100
    if (percentile >= 90) return 'text-yellow-500'
    if (percentile >= 75) return 'text-gray-400'
    if (percentile >= 50) return 'text-orange-400'
    return 'text-gray-600'
  }

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className={`w-4 h-4 ${
        rank === 1 ? 'text-yellow-500' :
        rank === 2 ? 'text-gray-400' : 'text-orange-400'
      }`} />
    }
    return <Medal className="w-4 h-4 text-blue-500" />
  }

  return (
    <div className="flex items-center space-x-3 mt-2">
      <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
        {getRankIcon(outletRank)}
        <span className={`ml-1 text-sm font-medium ${getRankColor(outletRank, outletTotal)}`}>
          #{outletRank}
        </span>
        <span className="text-xs text-gray-400 ml-1">/ {outletTotal} outlet</span>
      </div>
      <div className="flex items-center bg-green-50 px-3 py-1 rounded-full">
        {getRankIcon(companyRank)}
        <span className={`ml-1 text-sm font-medium ${getRankColor(companyRank, companyTotal)}`}>
          #{companyRank}
        </span>
        <span className="text-xs text-gray-400 ml-1">/ {companyTotal} company</span>
      </div>
    </div>
  )
}
