import { z } from 'zod'

function text(max: number, min = 1) {
  return z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, ' ').slice(0, max))
    .refine((value) => value.length >= min, { message: `Expected at least ${min} characters` })
}

export const reviewSchema = z.object({
  requirements: z
    .array(
      z.object({
        label: text(90, 2),
        category: z.enum(['skill', 'experience', 'qualification']).catch('skill'),
        importance: z.enum(['required', 'preferred']).catch('required'),
        coverage: z.enum(['strong', 'partial', 'missing']).catch('missing'),
        evidence: text(300, 0).nullable().catch(null),
        note: text(300, 0),
      }),
    )
    .min(1)
    .max(20),
  findings: z
    .array(
      z.object({
        title: text(90, 3),
        detail: text(400, 0),
        priority: z.enum(['high', 'medium', 'low']).catch('medium'),
      }),
    )
    .max(6)
    .catch([]),
  phrasing: z
    .array(
      z.object({
        yours: text(140, 3),
        posting: text(140, 2),
        note: text(200, 0),
      }),
    )
    .max(6)
    .catch([]),
  rewrites: z
    .array(
      z.object({
        original: text(400, 10),
        rewrite: text(400, 10),
        reason: text(240, 0),
      }),
    )
    .max(4)
    .catch([]),
})

export const rewriteSchema = z.object({
  rewrite: text(400, 10),
  rationale: text(240, 0),
})

export const reviewJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    requirements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          category: { type: 'string', enum: ['skill', 'experience', 'qualification'] },
          importance: { type: 'string', enum: ['required', 'preferred'] },
          coverage: { type: 'string', enum: ['strong', 'partial', 'missing'] },
          evidence: { type: ['string', 'null'] },
          note: { type: 'string' },
        },
        required: ['label', 'category', 'importance', 'coverage', 'evidence', 'note'],
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'detail', 'priority'],
      },
    },
    phrasing: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          yours: { type: 'string' },
          posting: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['yours', 'posting', 'note'],
      },
    },
    rewrites: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          original: { type: 'string' },
          rewrite: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['original', 'rewrite', 'reason'],
      },
    },
  },
  required: ['requirements', 'findings', 'phrasing', 'rewrites'],
} as const

export const rewriteJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    rewrite: { type: 'string' },
    rationale: { type: 'string' },
  },
  required: ['rewrite', 'rationale'],
} as const
