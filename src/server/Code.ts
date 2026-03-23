const SHEET_ID = '1ktdBTkGMAAl0Eodz5euC-Xa18sTTn62b1aN6w3yaB2I'
const SHEET_NAME = 'Gems'

export function getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = SpreadsheetApp.openById(SHEET_ID)
  const sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found`)
  return sheet
}

export function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('チームGemカタログ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}

export function getGems(): object[] {
  const sheet = getSheet()
  const lastRow = sheet.getLastRow()
  if (lastRow < 1) return []

  const data = sheet.getRange(1, 1, lastRow, 8).getValues()
  return data.map((row) => ({
    id: row[0],
    name: row[1],
    description: row[2],
    url: row[3],
    tags: row[4] ? String(row[4]).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    author: row[5],
    createdAt: row[6],
    votes: Number(row[7]) || 0,
  }))
}

export function generateId(sheet: GoogleAppsScript.Spreadsheet.Sheet): string {
  const lastRow = sheet.getLastRow()
  return `gem_${String(lastRow + 1).padStart(3, '0')}`
}

export function addGem(data: {
  name: string
  description: string
  url: string
  tags: string
  author: string
}): object {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)

  try {
    const sheet = getSheet()
    const id = generateId(sheet)
    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd')
    sheet.appendRow([id, data.name, data.description, data.url, data.tags, data.author, now, 0])
    return { success: true, id }
  } finally {
    lock.releaseLock()
  }
}

export function updateGem(gemId: string, data: {
  name: string
  description: string
  url: string
  tags: string
  author: string
}): object {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)

  try {
    const sheet = getSheet()
    const lastRow = sheet.getLastRow()
    if (lastRow < 1) return { success: false, error: 'Gem not found' }

    const ids = sheet.getRange(1, 1, lastRow, 1).getValues()
    const rowIndex = ids.findIndex((r) => r[0] === gemId)
    if (rowIndex === -1) return { success: false, error: 'Gem not found' }

    const targetRow = rowIndex + 1
    sheet.getRange(targetRow, 2, 1, 5).setValues([[
      data.name, data.description, data.url, data.tags, data.author,
    ]])
    return { success: true }
  } finally {
    lock.releaseLock()
  }
}

function changeVote(gemId: string, delta: 1 | -1): object {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)

  try {
    const sheet = getSheet()
    const lastRow = sheet.getLastRow()
    if (lastRow < 1) return { success: false, error: 'Gem not found' }

    const ids = sheet.getRange(1, 1, lastRow, 1).getValues()
    const rowIndex = ids.findIndex((r) => r[0] === gemId)
    if (rowIndex === -1) return { success: false, error: 'Gem not found' }

    const cell = sheet.getRange(rowIndex + 1, 8)
    const newCount = Math.max(0, (Number(cell.getValue()) || 0) + delta)
    cell.setValue(newCount)
    return { success: true, votes: newCount }
  } finally {
    lock.releaseLock()
  }
}

export function incrementVote(gemId: string): object {
  return changeVote(gemId, 1)
}

export function decrementVote(gemId: string): object {
  return changeVote(gemId, -1)
}
