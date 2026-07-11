'use client'

import { useState } from 'react'

interface ExpandableTextProps {
  text: string
  maxLength?: number
}

export default function ExpandableText({ text, maxLength = 300 }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldTruncate = text.length > maxLength

  const displayText =
    expanded || !shouldTruncate ? text : text.slice(0, maxLength).trimEnd() + '…'

  return (
    <div>
      <p className="text-white/70 leading-relaxed text-base whitespace-pre-line">
        {displayText}
      </p>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[#4D7CFF] hover:text-[#1B4FFF] text-sm font-medium transition-colors"
        >
          {expanded ? 'Lexo më pak' : 'Lexo më shumë'}
        </button>
      )}
    </div>
  )
}
