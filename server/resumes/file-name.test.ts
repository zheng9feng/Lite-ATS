import { describe, expect, it } from 'vitest'
import {
  createInlineContentDisposition,
  normalizeUploadedFileName,
} from './file-name'

describe('normalizeUploadedFileName', () => {
  it('repairs UTF-8 Chinese filenames decoded as Latin-1 by multipart parsing', () => {
    const fileName = '个人简历_张三_前端工程师.pdf'
    const mojibake = Buffer.from(fileName, 'utf8').toString('latin1')

    expect(normalizeUploadedFileName(mojibake)).toBe(fileName)
  })

  it('keeps already-correct Unicode filenames unchanged', () => {
    expect(normalizeUploadedFileName('个人简历.pdf')).toBe(
      '个人简历.pdf'
    )
  })
})

describe('createInlineContentDisposition', () => {
  it('adds an RFC 5987 UTF-8 filename for Chinese filenames', () => {
    const fileName = '个人简历.pdf'

    expect(createInlineContentDisposition(fileName)).toBe(
      `inline; filename="resume.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    )
  })
})
