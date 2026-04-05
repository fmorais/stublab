import type { ExportedEndpoint } from '../../schemas/import-export.js'
import type { ImportSource } from '../../schemas/import-external.js'

export interface ParseError {
  message: string
  path?: string
}

export interface ParseResult {
  success: boolean
  endpoints: ExportedEndpoint[]
  errors: ParseError[]
}

export interface ExternalParser {
  parse(content: unknown): ParseResult | Promise<ParseResult>
}

import { PostmanParser } from './postman-parser.js'
import { OpenApiParser } from './openapi-parser.js'

export function getParser(source: ImportSource): ExternalParser {
  switch (source) {
    case 'postman':
      return new PostmanParser()
    case 'openapi':
      return new OpenApiParser()
    case 'stublab':
      throw new Error('StubLab format uses the existing import flow')
  }
}
