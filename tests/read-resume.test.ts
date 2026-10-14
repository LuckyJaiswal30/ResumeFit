import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractBullets } from '@/lib/resume/ats'
import { looksLikeResume, resumeRejectionMessage } from '@/lib/resume/looks-like-resume'
import {
  distinctPeople,
  looksGarbled,
  readResume,
  ResumeReadError,
  samePerson,
  sniff,
} from '@/lib/resume/read-resume'
import { makeDocx, makeOdt, makeZip, word } from './helpers/make-office'
import { makePdf, makePdfPages } from './helpers/make-pdf'

const realFetch = globalThis.fetch

const RESUME_LINES = [
  'Ravi Kumar',
  'ravi.kumar@example.com | +91 98765 43210 | linkedin.com/in/ravikumar',
  'EXPERIENCE',
  'Accounts Executive, Sharma Traders | 2021 - Present',
  '- Reconciled monthly ledgers for 120 vendor accounts in Tally.',
  '- Cut invoice processing time from five days to two.',
  '- Prepared GST returns and quarterly reports for the owners.',
  'EDUCATION',
  'BCom, University of Delhi | 2021',
  'SKILLS',
  'Tally, Excel, GST filing, bank reconciliation',
]
const RESUME = RESUME_LINES.join('\n')

const text = (value: string) => new Uint8Array(Buffer.from(value))
const file = (name: string, bytes: Uint8Array) => ({ name, bytes })
const read = (name: string, bytes: Uint8Array) => readResume([file(name, bytes)])

// Enough bytes after the signature for a real-looking picture.
function picture(signature: number[]) {
  const bytes = new Uint8Array(30 * 1024)
  bytes.set(signature)
  return bytes
}
const PNG = picture([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG = picture([0xff, 0xd8, 0xff, 0xe0])

function textPdf() {
  return makePdf(RESUME_LINES.map((line, index) => ({ text: line, x: 40, y: 50 + index * 16 })))
}

type GeminiCall = { parts: Array<Record<string, unknown>> }
let calls: GeminiCall[] = []

type Page = { kind: string; candidates: string[] }
type Reply = { readable: boolean; text: string; pages?: Page[]; separateDocuments?: boolean }

const resumePage = (...candidates: string[]): Page => ({ kind: 'resume', candidates })

function stubGemini(reply: Reply | { status: number }) {
  calls = []
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    calls.push({ parts: JSON.parse(init.body).contents[0].parts })
    if ('status' in reply) return new Response('{}', { status: reply.status })
    const payload = {
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(reply) }] } }],
    }
    return new Response(JSON.stringify(payload), { status: 200 })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  for (const key of ['AI_PROVIDER', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GROQ_API_KEY']) {
    delete process.env[key]
  }
  delete process.env.AI_BUDGET_PER_MINUTE
  calls = []
})

afterEach(() => {
  globalThis.fetch = realFetch
})

function withGemini(model: string) {
  process.env.GEMINI_API_KEY = 'test-key'
  process.env.GEMINI_MODEL = model
}

describe('working out what a file is', () => {
  it('goes by the contents, not the name', () => {
    assert.equal(sniff(textPdf()).type, 'pdf')
    assert.equal(sniff(makeDocx({ body: word.p('Hi') })).type, 'docx')
    assert.equal(sniff(makeOdt({ body: '<text:p>Hi</text:p>' })).type, 'odt')
    assert.equal(sniff(readFileSync('tests/fixtures/legacy-resume.doc')).type, 'doc')
    assert.equal(sniff(text('{\\rtf1\\ansi Hello}')).type, 'rtf')
    assert.equal(sniff(PNG).type, 'image')
    assert.equal(sniff(text('<!DOCTYPE html><html><body>Hi</body></html>')).type, 'html')
    assert.equal(sniff(text(RESUME)).type, 'text')
  })

  it('finds a PDF that has junk in front of its header', () => {
    assert.equal(sniff(new Uint8Array([...text('\r\n\r\n'), ...textPdf()])).type, 'pdf')
  })

  it('recognises image formats the model cannot take', () => {
    for (const signature of ['GIF89a', 'BM', 'II*\u0000']) {
      assert.equal(
        sniff(new Uint8Array([...text(signature), ...new Uint8Array(32)])).type,
        'other-image',
      )
    }
  })

  it('tells a Pages file and a plain zip apart from a Word document', () => {
    assert.equal(sniff(makeZip({ 'Index/Document.iwa': 'x' })).type, 'pages')
    assert.equal(sniff(makeZip({ 'notes.txt': 'x' })).type, 'zip')
  })
})

describe('files whose name does not match their contents', () => {
  it('reads a Word document saved with a .pdf name', async () => {
    const docx = makeDocx({ body: RESUME_LINES.map(word.p).join('') })
    assert.match((await read('Resume.docx (3).pdf', docx)).text, /Sharma Traders/)
  })

  it('reads a text resume with no extension at all', async () => {
    assert.match((await read('resume', text(RESUME))).text, /Sharma Traders/)
  })

  it('reads a PDF named .txt', async () => {
    assert.match((await read('resume.txt', textPdf())).text, /Sharma Traders/)
  })
})

describe('Word documents', () => {
  const body = [
    word.p('EXPERIENCE'),
    word.p('Accounts Executive, Sharma Traders | 2021 - Present'),
    word.bullet('Reconciled monthly ledgers for 120 vendor accounts in Tally.'),
    word.bullet('Cut invoice processing time from five days to two.'),
    word.bullet('Prepared GST returns and quarterly reports for the owners.'),
    word.table([
      ['EDUCATION', 'BCom, University of Delhi | 2021'],
      ['SKILLS', 'Tally, Excel, GST filing'],
    ]),
    word.textbox('Languages: English, Hindi, Punjabi'),
  ].join('')
  const header = word.p('Ravi Kumar | ravi.kumar@example.com | +91 98765 43210')
  const footer = word.p('References available on request')

  it('keeps the name and contact details from the page header', async () => {
    const { text: result } = await read('cv.docx', makeDocx({ body, header }))
    assert.ok(result.startsWith('Ravi Kumar | ravi.kumar@example.com'), result)
  })

  it('keeps list bullets as bullets', async () => {
    const { text: result } = await read('cv.docx', makeDocx({ body, header }))
    assert.equal(extractBullets(result).length, 3)
  })

  it('reads tables cell by cell and text boxes once', async () => {
    const { text: result } = await read('cv.docx', makeDocx({ body, header }))
    assert.match(result, /EDUCATION\nBCom, University of Delhi \| 2021/)
    assert.equal(result.match(/Languages: English/g)?.length, 1)
  })

  it('adds the footer at the end without doubling lines the body already has', async () => {
    const { text: result } = await read(
      'cv.docx',
      makeDocx({ body: body + header, header, footer }),
    )
    assert.equal(result.match(/ravi\.kumar@example\.com/g)?.length, 1)
    assert.ok(result.trim().endsWith('References available on request'))
  })

  it('passes the resume check end to end', async () => {
    const { text: result } = await read('cv.docx', makeDocx({ body, header }))
    assert.ok(looksLikeResume(result).ok)
  })
})

describe('older and other document formats', () => {
  it('reads a Word 97-2003 .doc', async () => {
    const { text: result } = await read('cv.doc', readFileSync('tests/fixtures/legacy-resume.doc'))
    assert.match(result, /^Ravi Kumar\nravi\.kumar@example\.com/)
    assert.equal(extractBullets(result).length, 3)
    assert.ok(looksLikeResume(result).ok)
  })

  it('reads an OpenDocument .odt with its list bullets and page header', async () => {
    const odt = makeOdt({
      header: '<text:p>Ravi Kumar | ravi.kumar@example.com</text:p>',
      body: [
        '<text:h>EXPERIENCE</text:h>',
        '<text:p>Accounts Executive, <text:span>Sharma Traders</text:span> | 2021 - Present</text:p>',
        '<text:list>',
        ...RESUME_LINES.slice(4, 7).map(
          (line) => `<text:list-item><text:p>${line.slice(2)}</text:p></text:list-item>`,
        ),
        '</text:list>',
        '<text:p>EDUCATION</text:p><text:p>BCom<text:tab/>University of Delhi | 2021</text:p>',
      ].join(''),
    })
    const { text: result } = await read('cv.odt', odt)
    assert.ok(result.startsWith('Ravi Kumar | ravi.kumar@example.com'), result)
    assert.match(result, /Accounts Executive, Sharma Traders \| 2021 - Present/)
    assert.equal(extractBullets(result).length, 3)
  })

  it('reads an .rtf, skipping its font and colour tables', async () => {
    const rtf =
      String.raw`{\rtf1\ansi\ansicpg1252{\fonttbl{\f0 Helvetica;}}{\colortbl;\red0\green0\blue0;}
{\header Ravi Kumar \'96 ravi.kumar@example.com\par}
\f0 EXPERIENCE\par
Accounts Executive, Sharma Traders | 2021 - Present\par
{\listtext\'95\tab}Reconciled monthly ledgers for 120 vendor accounts in Tally.\par
{\listtext\'95\tab}Cut invoice processing time from five days to two.\par
Caf\'e9 shifts and ` +
      // Built by hand: a \u escape inside String.raw gets turned into the character itself.
      ['\\u8220?quoted', '\\u8221? text', '\\par}'].join('')
    const { text: result } = await read('cv.rtf', text(rtf))
    assert.ok(!/Helvetica|red0/.test(result), result)
    assert.match(result, /Ravi Kumar – ravi\.kumar@example\.com/)
    assert.match(result, /Café shifts and “quoted” text/)
    assert.equal(extractBullets(result).length, 2)
  })

  it('reads a resume saved as a web page', async () => {
    const html = `<!DOCTYPE html><html><head><title>CV</title><style>p{}</style></head><body>
      <h1>Ravi Kumar</h1><p>ravi.kumar@example.com</p><h2>Experience</h2>
      <ul><li>Reconciled monthly ledgers &amp; vendor accounts in Tally.</li></ul></body></html>`
    const { text: result } = await read('cv.html', text(html))
    assert.ok(!/CV|p\{\}/.test(result), result)
    assert.match(result, /- Reconciled monthly ledgers & vendor accounts in Tally\./)
  })

  it('reads the PDF preview inside a Pages file', async () => {
    const pages = makeZip({ 'Index/Document.iwa': 'x', 'QuickLook/Preview.pdf': textPdf() })
    assert.match((await read('cv.pages', pages)).text, /Sharma Traders/)
  })

  it('explains how to export a Pages file with no preview', async () => {
    await assert.rejects(
      () => read('cv.pages', makeZip({ 'Index/Document.iwa': 'x' })),
      /File › Export To › PDF/,
    )
  })

  it('gives a specific reason for files it cannot use', async () => {
    await assert.rejects(() => read('cv.zip', makeZip({ 'a.txt': 'x' })), /zip archive/)
    await assert.rejects(
      () => read('cv.gif', new Uint8Array([...text('GIF89a'), ...new Uint8Array(64)])),
      /JPG or PNG/,
    )
    await assert.rejects(
      () =>
        read('cv.bin', new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0, 0, 0, 3, 0, 0x3e, 0])),
      (error: Error) => error instanceof ResumeReadError && /can’t be read/.test(error.message),
    )
    await assert.rejects(() => read('cv.txt', new Uint8Array()), /empty/)
  })
})

describe('garbled text layers', () => {
  it('passes ordinary resume text', () => {
    assert.equal(looksGarbled(RESUME.repeat(3)), false)
  })

  it('catches private-use glyphs and unmapped character ids', () => {
    assert.ok(looksGarbled(' Ravi '.repeat(10)))
    assert.ok(looksGarbled('(cid:12)(cid:45)(cid:3) Experience'))
  })

  it('catches consonant soup from a font with no character map', () => {
    assert.ok(looksGarbled('Xkrtz Pqmnd Vbcxz Hgfrt Zxcvb Lkjhg Mnbvc Qwrtp '.repeat(4)))
  })
})

describe('when the local read is not enough', () => {
  it('has the model read a PDF with a scanned page in the middle', async () => {
    withGemini('mixed-pdf-model')
    stubGemini({ readable: true, text: RESUME })
    const pdf = makePdfPages([
      RESUME_LINES.slice(0, 6).map((line, index) => ({ text: line, x: 40, y: 50 + index * 16 })),
      [],
    ])
    const result = await read('cv.pdf', pdf)
    assert.equal(result.transcribed, true)
    assert.equal(calls.length, 1)
    assert.equal((calls[0].parts[0].inlineData as { mimeType: string }).mimeType, 'application/pdf')
  })

  it('keeps a usable local read when the model fails', async () => {
    withGemini('failing-model')
    stubGemini({ status: 500 })
    const pdf = makePdfPages([
      RESUME_LINES.map((line, index) => ({ text: line, x: 40, y: 50 + index * 16 })),
      [],
    ])
    const result = await read('cv.pdf', pdf)
    assert.equal(result.transcribed, false)
    assert.match(result.text, /Sharma Traders/)
  })

  it('does not call the model for an ordinary text PDF', async () => {
    withGemini('text-pdf-model')
    stubGemini({ readable: true, text: 'should not be used' })
    const result = await read('cv.pdf', textPdf())
    assert.equal(result.transcribed, false)
    assert.equal(calls.length, 0)
  })

  it('reads a Word document that is only a pasted-in scan', async () => {
    withGemini('docx-image-model')
    stubGemini({ readable: true, text: RESUME })
    const docx = makeDocx({ body: word.p(' '), media: { 'image1.png': PNG } })
    const result = await read('cv.docx', docx)
    assert.equal(result.transcribed, true)
    assert.equal((calls[0].parts[0].inlineData as { mimeType: string }).mimeType, 'image/png')
  })
})

describe('several photos of one resume', () => {
  it('sends every page, in order, in a single request', async () => {
    withGemini('pages-model')
    stubGemini({ readable: true, text: RESUME })
    const result = await readResume([file('page1.jpg', JPEG), file('page2.png', PNG)])
    assert.equal(result.transcribed, true)
    assert.equal(calls.length, 1)
    const types = calls[0].parts
      .filter((part) => part.inlineData)
      .map((part) => (part.inlineData as { mimeType: string }).mimeType)
    assert.deepEqual(types, ['image/jpeg', 'image/png'])
  })

  it('refuses a mix of photos and documents', async () => {
    withGemini('mix-model')
    await assert.rejects(
      () => readResume([file('page1.jpg', JPEG), file('cv.pdf', textPdf())]),
      /one document, or up to five photos/,
    )
  })

  it('refuses more than five pages', async () => {
    withGemini('many-model')
    const many = Array.from({ length: 6 }, (_, index) => file(`p${index}.jpg`, JPEG))
    await assert.rejects(() => readResume(many), /up to 5 photos/)
  })
})

describe('one person per upload', () => {
  const twoPhotos = () => readResume([file('page1.jpg', JPEG), file('page2.png', PNG)])

  it('refuses pages from two different people', async () => {
    withGemini('two-people-model')
    stubGemini({
      readable: true,
      text: RESUME,
      pages: [resumePage('Ravi Kumar'), resumePage('Amit Sharma')],
      separateDocuments: true,
    })
    await assert.rejects(twoPhotos, /more than one person \(Ravi Kumar and Amit Sharma\)/)
  })

  it('refuses two resumes photographed side by side on one page', async () => {
    withGemini('one-photo-two-people-model')
    stubGemini({
      readable: true,
      text: RESUME,
      pages: [resumePage('Ravi Kumar', 'Amit Sharma')],
      separateDocuments: false,
    })
    await assert.rejects(() => read('desk.jpg', JPEG), /more than one person/)
  })

  it('refuses a page that is not part of a resume', async () => {
    withGemini('stray-page-model')
    stubGemini({
      readable: true,
      text: RESUME,
      pages: [resumePage('Ravi Kumar'), { kind: 'job-posting', candidates: [] }],
      separateDocuments: true,
    })
    await assert.rejects(twoPhotos, /Page 2 looks like a job posting/)
  })

  it('refuses when the reader says the files are separate documents', async () => {
    withGemini('separate-model')
    stubGemini({
      readable: true,
      text: RESUME,
      pages: [resumePage('Ravi Kumar'), resumePage()],
      separateDocuments: true,
    })
    await assert.rejects(twoPhotos, /more than one person’s resume/)
  })

  it('accepts one person whose name is printed differently on each page', async () => {
    withGemini('same-person-model')
    stubGemini({
      readable: true,
      text: RESUME,
      pages: [resumePage('RAVI KUMAR'), resumePage('Kumar, R.')],
      separateDocuments: false,
    })
    assert.equal((await twoPhotos()).transcribed, true)
  })

  it('accepts a continuation page and a blank page with no name on them', async () => {
    withGemini('continuation-model')
    stubGemini({
      readable: true,
      text: RESUME,
      pages: [resumePage('Ravi Kumar'), resumePage(), { kind: 'blank', candidates: [] }],
      separateDocuments: false,
    })
    const pages = [file('1.jpg', JPEG), file('2.png', PNG), file('3.jpg', JPEG)]
    assert.equal((await readResume(pages)).transcribed, true)
  })

  it('applies the same check to a scanned PDF', async () => {
    withGemini('scanned-two-people-model')
    stubGemini({
      readable: true,
      text: RESUME,
      pages: [resumePage('Ravi Kumar'), resumePage('Amit Sharma')],
      separateDocuments: true,
    })
    await assert.rejects(() => read('scan.pdf', makePdfPages([[], []])), /more than one person/)
  })
})

describe('telling people apart by name', () => {
  it('matches the same name written differently', () => {
    assert.ok(samePerson('Ravi Kumar', 'RAVI KUMAR'))
    assert.ok(samePerson('Ravi Kumar', 'Kumar Ravi'))
    assert.ok(samePerson('Ravi Kumar', 'R. Kumar'))
    assert.ok(samePerson('Zoë Müller-Santos', 'ZOË MÜLLER-SANTOS'))
  })

  it('separates people who only share a surname', () => {
    assert.ok(!samePerson('Ravi Kumar', 'Amit Kumar'))
    assert.deepEqual(distinctPeople(['Ravi Kumar', 'RAVI KUMAR', 'Amit Kumar', ' ']), [
      'Ravi Kumar',
      'Amit Kumar',
    ])
  })
})

describe('two resumes in one text', () => {
  const second = [
    'Amit Sharma',
    'amit.sharma@example.com | +91 91234 56789',
    'EXPERIENCE',
    'Sales Associate, Verma Retail | 2020 - Present',
    '- Ran the electronics counter and hit monthly targets for two years.',
    'EDUCATION',
    'BA Economics, University of Mumbai | 2020',
  ].join('\n')

  it('refuses two resumes run together in one file or one paste', () => {
    const check = looksLikeResume(`${RESUME}\n\n${second}`)
    assert.equal(check.ok, false)
    assert.equal(check.several, true)
    assert.match(resumeRejectionMessage(check), /more than one person’s resume/)
  })

  it('still accepts one resume that lists a referee’s email', () => {
    const withReferee = `${RESUME}\n\nREFERENCES\nMr. Anil Sharma, Owner, Sharma Traders\nanil@sharmatraders.example | +91 99999 11111`
    const check = looksLikeResume(withReferee)
    assert.equal(check.several, false)
    assert.ok(check.ok)
  })

  it('still accepts one resume with a work experience and a relevant experience section', () => {
    const twoHeadings =
      RESUME.replace('EXPERIENCE', 'WORK EXPERIENCE') +
      '\n\nRELEVANT EXPERIENCE\nVolunteer treasurer, Rotary Club | 2019 - 2021'
    assert.equal(looksLikeResume(twoHeadings).several, false)
  })
})
