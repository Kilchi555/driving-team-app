import { normalizeMultilineCompanyName } from '~/utils/billing-address-map'

type PdfTextDoc = {
  font: (name: string) => PdfTextDoc
  fontSize: (size: number) => PdfTextDoc
  fillColor: (color: string) => PdfTextDoc
  heightOfString: (text: string, options: { width: number }) => number
  text: (text: string, x: number, y: number, options: { width: number; height?: number }) => unknown
}

export const WINDOW_COMPANY_NAME_FONT = 'Helvetica-Bold'
export const WINDOW_COMPANY_NAME_SIZE = 11
const NAME_TO_STREET_GAP = 2
const STREET_BLOCK = 14
const MIN_NAME_HEIGHT = 14

export function measureWindowCompanyNameHeight(
  doc: PdfTextDoc,
  name: string,
  width: number
): number {
  doc.font(WINDOW_COMPANY_NAME_FONT).fontSize(WINDOW_COMPANY_NAME_SIZE)
  return Math.max(MIN_NAME_HEIGHT, doc.heightOfString(name, { width }))
}

/**
 * Draw the envelope-window company/person name and return the Y for the street.
 * Caps height so street + city stay inside the C5/C6 window. Does not mutate storage.
 */
export function drawWindowCompanyName(
  doc: PdfTextDoc,
  name: string,
  opts: {
    x: number
    y: number
    width: number
    windowBottom: number
    hasStreet: boolean
    hasCity: boolean
    color: string
  }
): { nameY: number; nameHeight: number; nextY: number } {
  const displayName = normalizeMultilineCompanyName(name)
  const reservedBelow =
    (opts.hasStreet ? STREET_BLOCK : 0) + (opts.hasCity ? STREET_BLOCK : 0)
  const maxNameH = Math.max(MIN_NAME_HEIGHT, opts.windowBottom - opts.y - reservedBelow - NAME_TO_STREET_GAP)
  doc.font(WINDOW_COMPANY_NAME_FONT).fontSize(WINDOW_COMPANY_NAME_SIZE).fillColor(opts.color)
  const measured = measureWindowCompanyNameHeight(doc, displayName, opts.width)
  const nameHeight = Math.min(maxNameH, measured)
  doc.text(displayName, opts.x, opts.y, { width: opts.width, height: nameHeight })
  return {
    nameY: opts.y,
    nameHeight,
    nextY: opts.y + nameHeight + NAME_TO_STREET_GAP,
  }
}
