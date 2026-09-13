'use client'

import React from 'react'
import { CheckCircle2, Star, TrendingUp, Home } from 'lucide-react'

export default function AuthAnimation() {
  return (
    <div className="relative w-full max-w-md mx-auto aspect-square perspective-1000">
      {/* Floating Elements Container */}
      <div className="absolute inset-0 flex items-center justify-center transform-style-3d">
        
        {/* Center Glowing Sphere */}
        <div className="absolute w-48 h-48 bg-[#C8B882]/20 rounded-full blur-3xl animate-pulse" />
        
        {/* Main Floating Card - Property */}
        <div className="absolute z-20 w-64 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl animate-[float_6s_ease-in-out_infinite]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#006459] to-[#005048] flex items-center justify-center text-white shadow-lg">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <div className="h-2.5 w-24 bg-white/40 rounded-full mb-1.5" />
              <div className="h-2 w-16 bg-white/20 rounded-full" />
            </div>
          </div>
          <div className="h-24 w-full bg-black/20 rounded-xl mb-3 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-3 w-16 bg-white/50 rounded-full" />
            <div className="h-3 w-12 bg-[#C8B882] rounded-full" />
          </div>
        </div>

        {/* Small Floating Card - Success (Top Right) */}
        <div className="absolute z-30 -right-8 top-12 w-40 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-xl animate-[float_5s_ease-in-out_infinite_1s]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#C8B882]" />
            <div className="h-2 w-20 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Small Floating Card - Rating (Bottom Left) */}
        <div className="absolute z-10 -left-12 bottom-20 w-44 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-xl animate-[float_7s_ease-in-out_infinite_2s]">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
          <div className="h-1.5 w-full bg-white/20 rounded-full" />
        </div>

        {/* Small Floating Card - Stats (Top Left) */}
        <div className="absolute z-0 -left-6 top-32 w-36 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-lg animate-[float_8s_ease-in-out_infinite_0.5s] scale-90">
          <div className="flex items-center justify-between mb-2">
            <div className="h-2 w-12 bg-white/30 rounded-full" />
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="h-8 w-full bg-gradient-to-t from-green-400/20 to-transparent rounded-b-lg" />
        </div>

      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(2deg);
          }
        }
      `}</style>
    </div>
  )
}
