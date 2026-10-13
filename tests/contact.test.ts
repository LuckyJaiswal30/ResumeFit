import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hasPhoneNumber } from '@/lib/resume/contact'

describe('phone number detection', () => {
  for (const text of [
    '+1 (415) 555-0182',
    'Call +44 7700 900321',
    'tel 555 0198',
    '07700 900321',
  ]) {
    it(`finds ${text}`, () => assert.ok(hasPhoneNumber(text)))
  }

  for (const text of [
    'Senior Engineer, Acme (2021 - 2024)',
    'Worked 2019 – 2023 at Beta',
    'Built 12 things in 2022',
    'jane@example.com | linkedin.com/in/jane',
  ]) {
    it(`ignores ${text}`, () => assert.ok(!hasPhoneNumber(text)))
  }
})
