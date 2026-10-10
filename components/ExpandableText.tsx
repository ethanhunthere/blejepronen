'use client'

import { useState, useRef, useEffect } from 'react'

interface ExpandableTextProps {
  text: string
  maxLength?: number
  clampLines?: number
  className?: string
}

export default function ExpandableText({
  text,
  maxLength,
  clampLines = 4,
  className = '',
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    const isOverflowing =
      el.scrollHeight > el.clientHeight + 2 || (maxLength ? text.length > maxLength : false)
    setCanExpand(isOverflowing)
  }, [text, clampLines, maxLength])

  return (
    <div className={className}>
      <p
        ref={textRef}
        className={`text-gray-600 leading-relaxed text-base whitespace-pre-line transition-all ${
          !expanded ? 'overflow-hidden' : ''
        }`}
        style={
          !expanded
            ? {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: clampLines,
              }
            : undefined
        }
      >
        {text}
      </p>
      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[#00675B] hover:text-[#004D43] text-sm font-semibold transition-colors duration-150 cursor-pointer"
        >
          {expanded ? 'Shfaq më pak' : 'Shfaq më shumë'}
        </button>
      )}
    </div>
  )
}
