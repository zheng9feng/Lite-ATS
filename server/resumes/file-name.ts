function countControlCharacters(value: string) {
  return [...value].filter((character) => {
    const codePoint = character.codePointAt(0) ?? 0

    return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)
  }).length
}

function hasReplacementCharacter(value: string) {
  return value.includes('\uFFFD')
}

function hasOnlyAscii(value: string) {
  return /^[\x20-\x7e]*$/.test(value)
}

function createAsciiFallback(fileName: string) {
  const extension = fileName.toLowerCase().endsWith('.pdf') ? '.pdf' : ''
  const baseName = fileName
    .replace(/\.[^.]*$/, '')
    .replace(/[^\x20-\x7e]+/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${baseName || 'resume'}${extension}`
}

export function normalizeUploadedFileName(fileName: string) {
  if (hasOnlyAscii(fileName)) {
    return fileName
  }

  const decoded = Buffer.from(fileName, 'latin1').toString('utf8')

  if (
    decoded !== fileName &&
    !hasReplacementCharacter(decoded) &&
    countControlCharacters(decoded) < countControlCharacters(fileName)
  ) {
    return decoded
  }

  return fileName
}

export function createInlineContentDisposition(fileName: string) {
  return `inline; filename="${createAsciiFallback(fileName).replaceAll('"', '')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
