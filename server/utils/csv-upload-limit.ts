import { createError } from 'h3'

/** Statement uploads are rejected above 1 MiB before parsing. */
export const STATEMENT_UPLOAD_MAX_BYTES = 1_048_576

export function statementByteLength(content: string): number {
  return Buffer.byteLength(content, 'utf8')
}

export function assertStatementUploadSize(content: string): void {
  if (statementByteLength(content) > STATEMENT_UPLOAD_MAX_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `Datei ist grösser als ${STATEMENT_UPLOAD_MAX_BYTES} Bytes`,
    })
  }
}
