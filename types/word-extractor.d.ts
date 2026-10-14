declare module 'word-extractor' {
  type TextOptions = { filterUnicode?: boolean }

  export class WordDocument {
    getBody(options?: TextOptions): string
    getHeaders(options?: TextOptions & { includeFooters?: boolean }): string
    getFooters(options?: TextOptions): string
    getTextboxes(
      options?: TextOptions & { includeHeadersAndFooters?: boolean; includeBody?: boolean },
    ): string
  }

  export default class WordExtractor {
    extract(source: Buffer | string): Promise<WordDocument>
  }
}
