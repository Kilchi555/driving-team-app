import { describe, expect, it } from 'vitest'
import PDFDocument from 'pdfkit'
import { drawWindowCompanyName, measureWindowCompanyNameHeight } from '../pdf-window-company-name'

const WIN_WIDTH = 85 * 2.8346
const NAME_Y = 100

function layout(name: string, windowBottom = NAME_Y + 127) {
  const doc = new PDFDocument({ size: 'A4' })
  return drawWindowCompanyName(doc, name, {
    x: 50,
    y: NAME_Y,
    width: WIN_WIDTH,
    windowBottom,
    hasStreet: true,
    hasCity: true,
    color: '#111827',
  })
}

describe('drawWindowCompanyName', () => {
  it('moves the street below both lines of an explicit LF name', () => {
    const doc = new PDFDocument({ size: 'A4' })
    const singleH = measureWindowCompanyNameHeight(doc, 'SBB Kreditoren', WIN_WIDTH)
    const twoLine = layout('SBB Kreditoren\nInfrastruktur')
    expect(twoLine.nameHeight).toBeGreaterThan(singleH)
    expect(twoLine.nextY).toBeGreaterThan(NAME_Y + singleH)
  })

  it('moves the street down when a long one-line name wraps in the 85mm window', () => {
    const short = layout('Muster AG')
    const wrapped = layout('Stadt Schlieren Werke, Versorgung und Anlagen')
    expect(wrapped.nameHeight).toBeGreaterThan(short.nameHeight)
    expect(wrapped.nextY).toBeGreaterThan(short.nextY)
  })

  it('caps the name so street/city stay inside the window', () => {
    const tightBottom = NAME_Y + 14 + 14 + 14 + 2
    const manyLines = layout('A\nB\nC\nD\nE\nF\nG', tightBottom)
    expect(manyLines.nextY + 14 + 14).toBeLessThanOrEqual(tightBottom + 0.5)
  })
})
