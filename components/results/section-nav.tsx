'use client'

import { useEffect, useState } from 'react'

export type SectionLink = { id: string; label: string }

export function SectionNav({ sections }: { sections: SectionLink[] }) {
  const ids = sections.map((section) => section.id).join('|')
  const [active, setActive] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const targets = ids
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    if (targets.length === 0) return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const order = ids.split('|')
        const latest = order.filter((id) => visible.has(id)).pop()
        if (latest) setActive(latest)
      },
      { rootMargin: '-96px 0px -60% 0px' },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [ids])

  return (
    <nav
      aria-label="Sections of your analysis"
      className="sticky top-0 z-10 mt-6 -mx-5 border-b border-border bg-background/90 px-5 backdrop-blur-xl sm:-mx-8 sm:px-8"
    >
      <ul className="no-scrollbar flex gap-6 overflow-x-auto text-sm">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? 'location' : undefined}
              className={`block border-b-2 py-3.5 outline-none transition-colors focus-visible:text-foreground ${active === section.id ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
