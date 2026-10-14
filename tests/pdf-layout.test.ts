import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { layoutPage, type TextItem } from '@/lib/resume/pdf-layout'

function item(text: string, x: number, y: number, size = 10): TextItem {
  return { text, x, y, size, width: text.length * size * 0.48 }
}

function rightAligned(text: string, rightEdge: number, y: number, size = 10) {
  const placed = item(text, 0, y, size)
  return { ...placed, x: rightEdge - placed.width }
}

// Same geometry as a common Word/Google Docs template: a full-width header and summary, then
// Experience and Education side by side, then three columns of skills, then a full-width list.
function bandedResume() {
  return [
    item('ASHA', 54, 701, 32),
    item('MENON', 54, 664, 32),
    rightAligned('14 Park Road, Pune', 558, 717),
    rightAligned('98765 43210', 558, 699),
    rightAligned('asha.menon@example.com', 558, 681),
    item('About me', 54, 608, 15),
    item(
      'Final-year commerce student with a focus on finance and operations, looking for',
      54,
      578,
    ),
    item('an analyst role in a growing team.', 54, 563),
    item('Projects & Experience', 54, 527, 15),
    item('Education', 347, 527, 15),
    item('Finance Society / Pune University', 54, 475),
    item('2023 - Present', 54, 460),
    item('Ran budgeting workshops', 54, 445),
    item('for forty first-years.', 54, 430),
    item('Retail internship / Kapoor Stores', 54, 400),
    item('2022 - 2022', 54, 385),
    item('Reconciled weekly stock', 54, 370),
    item('counts across three shops.', 54, 355),
    item('Built a sales tracker', 54, 340),
    item('in Google Sheets.', 54, 325),
    item('BCom / Pune University', 347, 475),
    item('CGPA 7.9', 347, 460),
    item('Focus on accounting', 347, 443),
    item('and business finance.', 347, 428),
    item('Class XII / CBSE', 347, 397),
    item('Score 81%', 347, 382),
    item('Skills', 54, 290, 15),
    item('Finance: Tally,', 72, 259),
    item('budgeting', 72, 244),
    item('Excel: pivots,', 240, 259),
    item('lookups', 240, 244),
    item('People: teamwork,', 408, 259),
    item('mentoring', 408, 244),
    item('Activities', 54, 200, 15),
    item('Led the college quiz club for two years and grew it to sixty members.', 54, 170),
  ]
}

function inRowOrder(items: TextItem[]) {
  return [...items].sort((a, b) => b.y - a.y || a.x - b.x)
}

function assertColumnsKeptApart(text: string) {
  assert.ok(!/workshops\s+Focus|Pune University\s+BCom/.test(text), 'columns were merged')
  const lines = text.split('\n')
  assert.ok(lines.includes('Ran budgeting workshops'), 'left column line was broken up')
  assert.ok(lines.includes('Focus on accounting'), 'right column line was broken up')
  assert.ok(
    text.indexOf('in Google Sheets.') < text.indexOf('BCom / Pune University'),
    'left column should be read before the right one',
  )
  assert.ok(
    text.indexOf('Score 81%') < text.indexOf('Skills'),
    'Skills heading moved into a column',
  )
}

describe('a page written in reading order', () => {
  it('keeps side-by-side columns apart even when full-width text sits above and below them', () => {
    assertColumnsKeptApart(layoutPage(bandedResume()).join('\n'))
  })

  it('reads three skill columns one at a time', () => {
    const text = layoutPage(bandedResume()).join('\n')
    assert.match(text, /Finance: Tally,\nbudgeting\nExcel: pivots,\nlookups\nPeople: teamwork,/)
  })

  it('keeps the name together and ahead of the contact details', () => {
    const text = layoutPage(bandedResume()).join('\n')
    assert.match(text, /^ASHA\nMENON\n14 Park Road, Pune\n98765 43210\nasha\.menon@example\.com/)
  })
})

describe('a page written row by row across the columns', () => {
  it('still keeps the columns apart', () => {
    assertColumnsKeptApart(layoutPage(inRowOrder(bandedResume())).join('\n'))
  })

  it('keeps the name together and ahead of the contact details', () => {
    const lines = layoutPage(inRowOrder(bandedResume()))
    assert.ok(lines.indexOf('MENON') >= 0 && lines.indexOf('MENON') < lines.indexOf('98765 43210'))
    assert.ok(!lines.some((line) => /ASHA 98765|MENON asha/.test(line)), 'name merged with contact')
  })

  it('does not split a single column resume with dates against the right margin', () => {
    const items = inRowOrder([
      item('Data Analyst, Northwind', 54, 700),
      item('2021 - Present', 480, 700),
      item('- Built the weekly revenue dashboard used by the sales and finance teams.', 54, 685),
      item('Junior Analyst, Contoso', 54, 660),
      item('2019 - 2021', 492, 660),
      item('- Automated the month-end close checks, saving two days each month.', 54, 645),
      item('Intern, Fabrikam', 54, 620),
      item('2018 - 2019', 492, 620),
      item('Graduate Trainee, Litware', 54, 605),
      item('2017 - 2018', 492, 605),
    ])
    const lines = layoutPage(items)
    assert.ok(lines.includes('Data Analyst, Northwind 2021 - Present'), lines.join('\n'))
    assert.ok(lines.includes('Graduate Trainee, Litware 2017 - 2018'), lines.join('\n'))
  })
})

describe('a page stored in no particular order', () => {
  it('falls back to reading it by position', () => {
    const ordered = [
      item('EXPERIENCE', 54, 700, 14),
      item('Engineer, Northwind | 2021 - Present', 54, 680),
      item('- Led the move to a typed codebase across forty services.', 54, 665),
      item('- Cut build times from twelve minutes to four.', 54, 650),
      item('- Mentored three new graduates through their first year.', 54, 635),
      item('EDUCATION', 54, 600, 14),
      item('BSc Computing, University of Leeds | 2021', 54, 580),
    ]
    const shuffled = [3, 6, 0, 5, 2, 4, 1].map((index) => ordered[index])
    assert.deepEqual(
      layoutPage(shuffled),
      ordered.map((entry) => entry.text),
    )
  })
})

describe('letter-spaced headings', () => {
  it('closes up a spaced-out heading', () => {
    assert.deepEqual(layoutPage([item('E X P E R I E N C E', 54, 700)]), ['EXPERIENCE'])
  })

  it('keeps the space between spaced-out words', () => {
    const lines = layoutPage([item('W O R K', 54, 700), item('E X P E R I E N C E', 100, 700)])
    assert.deepEqual(lines, ['WORK EXPERIENCE'])
  })

  it('closes up a heading drawn one letter at a time', () => {
    const letters = Array.from('SKILLS', (letter, index) => item(letter, 54 + index * 12, 700))
    assert.deepEqual(layoutPage(letters), ['SKILLS'])
  })

  it('leaves ordinary short words alone', () => {
    assert.deepEqual(layoutPage([item('Plan A to Z', 54, 700)]), ['Plan A to Z'])
  })
})
