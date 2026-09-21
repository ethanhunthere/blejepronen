'use client'

import { useState, useMemo } from 'react'
import { Calculator, Percent, Calendar, Euro, Info, RotateCcw } from 'lucide-react'

interface MortgageCalculatorProps {
  propertyPrice: number
  city?: string
  className?: string
}

export default function MortgageCalculator({
  propertyPrice,
  city = 'Kosovë',
  className = '',
}: MortgageCalculatorProps) {
  const [price, setPrice] = useState<number>(propertyPrice || 100000)
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20)
  const [loanYears, setLoanYears] = useState<number>(20)
  const [interestRate, setInterestRate] = useState<number>(4.5)

  // Quick preset options
  const DOWN_PAYMENT_PRESETS = [10, 15, 20, 25, 30]
  const LOAN_TERM_PRESETS = [10, 15, 20, 25, 30]

  // Calculated values
  const { downPaymentAmount, loanPrincipal, monthlyPayment, totalPayment, totalInterest } =
    useMemo(() => {
      const validPrice = Math.max(0, price || 0)
      const downAmount = Math.round((validPrice * downPaymentPercent) / 100)
      const principal = Math.max(0, validPrice - downAmount)

      const months = Math.max(1, loanYears * 12)
      const monthlyRate = interestRate / 100 / 12

      let monthly = 0
      if (principal <= 0) {
        monthly = 0
      } else if (monthlyRate <= 0) {
        monthly = principal / months
      } else {
        const factor = Math.pow(1 + monthlyRate, months)
        monthly = (principal * (monthlyRate * factor)) / (factor - 1)
      }

      const total = monthly * months
      const interest = Math.max(0, total - principal)

      return {
        downPaymentAmount: downAmount,
        loanPrincipal: principal,
        monthlyPayment: Math.round(monthly),
        totalPayment: Math.round(total),
        totalInterest: Math.round(interest),
      }
    }, [price, downPaymentPercent, loanYears, interestRate])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('sq-AL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val)

  return (
    <div
      className={`bg-white border border-gray-100/90 shadow-2xs rounded-3xl p-5 sm:p-7 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-[#00675B] shadow-2xs">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#101828]">
              Kalkulatori i Kredisë Hipotekare
            </h2>
            <p className="text-xs text-gray-500">
              Llogarit këstin mujor për blerjen e kësaj prone në {city}
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#00675B] border border-emerald-100">
          Financim Bankar
        </span>
      </div>

      {/* Hero Monthly Estimate Card */}
      <div className="bg-gradient-to-br from-[#00675B] to-[#004D43] text-white rounded-2xl p-5 sm:p-6 mb-6 shadow-md shadow-[#00675B]/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-200/90 uppercase tracking-wider">
              Kësti Mujor i Parashikuar
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {formatCurrency(monthlyPayment)}
              </span>
              <span className="text-sm font-semibold text-emerald-200">/muaj</span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-1">
              Për {loanYears} vite me normë interesi {interestRate}%
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 sm:text-right border border-white/15">
            <div className="text-[11px] text-emerald-200 font-medium">Shuma e Kredisë</div>
            <div className="text-base font-bold text-white mt-0.5">
              {formatCurrency(loanPrincipal)}
            </div>
            <div className="text-[11px] text-emerald-300 mt-0.5">
              Pjesëmarrja: {formatCurrency(downPaymentAmount)} ({downPaymentPercent}%)
            </div>
          </div>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden flex gap-0.5">
            <div
              style={{
                width: `${Math.min(100, Math.max(5, (downPaymentAmount / (totalPayment + downPaymentAmount || 1)) * 100))}%`,
              }}
              className="h-full bg-[#C8B882] rounded-l-full transition-all duration-300"
              title="Pjesëmarrja Vetjake"
            />
            <div
              style={{
                width: `${Math.min(100, Math.max(10, (loanPrincipal / (totalPayment + downPaymentAmount || 1)) * 100))}%`,
              }}
              className="h-full bg-emerald-300 transition-all duration-300"
              title="Kredia (Kryegjëja)"
            />
            <div
              style={{
                width: `${Math.min(100, Math.max(5, (totalInterest / (totalPayment + downPaymentAmount || 1)) * 100))}%`,
              }}
              className="h-full bg-amber-300 rounded-r-full transition-all duration-300"
              title="Interesi Bankar"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px] text-emerald-100/90 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-sm bg-[#C8B882]" />
              <span>Pjesëmarrja: {formatCurrency(downPaymentAmount)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-sm bg-emerald-300" />
              <span>Kredia: {formatCurrency(loanPrincipal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-sm bg-amber-300" />
              <span>Interesi: {formatCurrency(totalInterest)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="space-y-4">
        {/* 0. Property Price Adjustment */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Euro className="h-3.5 w-3.5 text-[#00675B]" />
              <span>Çmimi i Pronës</span>
            </label>
            {price !== propertyPrice && (
              <button
                type="button"
                onClick={() => setPrice(propertyPrice)}
                className="text-[11px] font-semibold text-[#00675B] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Rivendos në {formatCurrency(propertyPrice)}
              </button>
            )}
          </div>
          <div className="relative flex items-center rounded-xl bg-gray-50 border border-gray-200 focus-within:border-[#00675B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00675B]/15 transition-all">
            <span className="pl-3 text-sm font-bold text-gray-400">€</span>
            <input
              type="number"
              min={1000}
              step={1000}
              value={price || ''}
              onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full h-9 pl-2 pr-3 text-xs sm:text-sm font-bold text-[#101828] bg-transparent outline-none"
              placeholder="Shkruaj çmimin e pronës"
            />
          </div>
        </div>

        {/* 1. Down payment percent */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-[#00675B]" />
              <span>Pjesëmarrja Vetjake</span>
            </label>
            <span className="text-xs font-bold text-[#00675B]">
              {downPaymentPercent}% ({formatCurrency(downPaymentAmount)})
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {DOWN_PAYMENT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDownPaymentPercent(p)}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  downPaymentPercent === p
                    ? 'bg-[#00675B] text-white border-[#00675B] shadow-2xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* 2. Loan term in years */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#00675B]" />
              <span>Afati i Kredisë</span>
            </label>
            <span className="text-xs font-bold text-[#00675B]">{loanYears} vite ({loanYears * 12} këste)</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {LOAN_TERM_PRESETS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setLoanYears(y)}
                className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  loanYears === y
                    ? 'bg-[#00675B] text-white border-[#00675B] shadow-2xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {y} vite
              </button>
            ))}
          </div>
        </div>

        {/* 3. Interest rate slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Euro className="h-3.5 w-3.5 text-[#00675B]" />
              <span>Norma Vjetore e Interesit</span>
            </label>
            <span className="text-xs font-extrabold text-[#00675B] px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">
              {interestRate.toFixed(1)}%
            </span>
          </div>

          <input
            type="range"
            min="3.0"
            max="7.0"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00675B]"
          />

          <div className="flex justify-between text-[10px] text-gray-600 mt-1 font-semibold">
            <span>3.0% (Preferenciale)</span>
            <span>4.5% (Mesatare Kosovë)</span>
            <span>7.0%</span>
          </div>
        </div>
      </div>

      {/* Summary Matrix */}
      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-[10px] uppercase font-bold text-gray-600">Çmimi i Pronës</div>
          <div className="text-xs font-extrabold text-gray-900 mt-0.5">{formatCurrency(price)}</div>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-[10px] uppercase font-bold text-gray-600">Kredia Neto</div>
          <div className="text-xs font-extrabold text-[#00675B] mt-0.5">
            {formatCurrency(loanPrincipal)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-[10px] uppercase font-bold text-gray-600">Interesi Gjithsej</div>
          <div className="text-xs font-extrabold text-amber-700 mt-0.5">
            {formatCurrency(totalInterest)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-[10px] uppercase font-bold text-gray-600">Kthimi Total</div>
          <div className="text-xs font-extrabold text-gray-900 mt-0.5">
            {formatCurrency(totalPayment)}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-gray-50/70 border border-gray-100 text-[11px] text-gray-600 leading-relaxed">
        <Info className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
        <span>
          Llogaritje informative orientuese. Kushtet përfundimtare, normat efektive (NER) dhe pjesëmarrja e kërkuar përcaktohen nga bankat partnere në Kosovë (NLB, TEB, BKT, ProCredit, Raiffeisen etj.).
        </span>
      </div>
    </div>
  )
}
