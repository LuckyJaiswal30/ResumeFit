'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const SECTIONS = [
  ['#features', 'Features'],
  ['#how-it-works', 'How it works'],
  ['#limits', 'Limits'],
  ['#faq', 'FAQ'],
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[84rem] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="rounded-sm text-lg font-semibold tracking-[-0.05em] outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        >
          resumefit<span className="text-primary">.</span>
        </Link>
        <nav
          aria-label="Page sections"
          className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"
        >
          {SECTIONS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-sm outline-none transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              {label}
            </a>
          ))}
        </nav>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="-mr-2 rounded-md p-2 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {menuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Page sections"
          className="flex flex-col gap-1 border-t border-border px-3 py-3 text-sm md:hidden"
        >
          {SECTIONS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/30"
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
