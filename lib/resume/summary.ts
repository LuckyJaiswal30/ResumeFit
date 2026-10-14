import { buildPriorities } from './priorities'
import { BURIED_POSITION } from './tailor'
import type { Analysis, Requirement } from './types'

function section(title: string, lines: string[]) {
  return lines.length > 0 ? [`## ${title}`, '', ...lines, ''] : []
}

function requirementLine(item: Requirement) {
  const tag = item.importance === 'preferred' ? ' (nice to have)' : ''
  const quote = item.evidence && item.evidenceVerified ? `\n  > ${item.evidence}` : ''
  return `- **${item.label}**${tag} — ${item.note}${quote}`
}

export function buildSummary(analysis: Analysis, fileName: string): string {
  const requirements = analysis.match.requirements
  const covered = requirements.filter((item) => item.coverage !== 'missing')
  const missing = requirements.filter((item) => item.coverage === 'missing')
  const claimed = missing.filter((item) => item.evidence !== null)
  const absent = missing.filter((item) => item.evidence === null)

  const lines = [
    '# ResumeFit summary',
    '',
    `**Resume:** ${fileName}`,
    `**Overall fit:** ${analysis.match.score} / 100`,
    `**Basis:** ${analysis.source === 'ai' ? `reviewed by ${analysis.model}` : 'word matching only'}`,
    '',
    analysis.match.summary,
    '',
    ...section(
      'Fix this first',
      buildPriorities(analysis).map(
        (action, i) => `${i + 1}. **${action.title}** — ${action.detail}`,
      ),
    ),
    ...section(
      'Job title',
      analysis.title
        ? [
            `- The posting: ${analysis.title.posting}`,
            `- Your latest title: ${analysis.title.latest ?? 'not found'}`,
          ]
        : [],
    ),
    ...section(
      'Tailor it to this posting',
      analysis.tailoring
        ? [
            ...analysis.tailoring.priorities.map((item, i) => {
              const move =
                item.placement && item.placement.position >= BURIED_POSITION
                  ? ` — move "${item.placement.bullet}" to the top of ${item.placement.role}`
                  : ''
              return `${i + 1}. ${item.label}${move}`
            }),
            ...(analysis.tailoring.opener
              ? ['', `Opening line: ${analysis.tailoring.opener}`]
              : []),
            ...(analysis.tailoring.skills
              ? [
                  '',
                  `Skills order: ${analysis.tailoring.skills.prefix}${analysis.tailoring.skills.suggested.join(', ')}`,
                ]
              : []),
          ]
        : [],
    ),
    ...section('Where you align', covered.map(requirementLine)),
    ...section('Listed, but not shown', claimed.map(requirementLine)),
    ...section('Not there at all', absent.map(requirementLine)),
    ...section(
      'Same skill, different words',
      analysis.phrasing.map(
        (gap) => `- You wrote "${gap.yours}" — they ask for "${gap.posting}". ${gap.note}`,
      ),
    ),
    ...section(
      'Bullets worth rewriting',
      analysis.rewrites.flatMap((item) => [
        `- Original: ${item.original}`,
        `  Suggested: ${item.rewrite}`,
        `  Why: ${item.reason}`,
      ]),
    ),
    ...section(
      `How it reads to a parser (${analysis.ats.score} / 100)`,
      analysis.ats.checks.map(
        (check) => `- ${check.passed ? 'Pass' : 'Fix'}: ${check.label} — ${check.detail}`,
      ),
    ),
    ...section(
      'What the review flagged',
      analysis.findings.map((finding) => `- **${finding.title}** — ${finding.detail}`),
    ),
  ]

  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}
