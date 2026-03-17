import { describe, it, expect, vi, beforeEach } from 'vitest'

// ===== GAS API Mock helpers =====

type Row = unknown[]

function makeSheetMock(initialRows: Row[] = []) {
  const rows: Row[] = [...initialRows]
  return {
    _rows: rows,
    getLastRow: vi.fn(() => rows.length),
    getRange: vi.fn((startRow: number, startCol: number, numRows?: number, numCols?: number) => {
      if (numRows === undefined) {
        // single cell
        const row = rows[startRow - 1] ?? []
        const val = (row as Row)[startCol - 1] ?? 0
        return {
          getValue: vi.fn(() => val),
          setValue: vi.fn((v: unknown) => {
            if (!rows[startRow - 1]) rows[startRow - 1] = []
            ;(rows[startRow - 1] as Row)[startCol - 1] = v
          }),
        }
      }
      const slice = rows
        .slice(startRow - 1, startRow - 1 + numRows!)
        .map((r) => (r as Row).slice(startCol - 1, startCol - 1 + numCols!))
      return { getValues: vi.fn(() => slice) }
    }),
    appendRow: vi.fn((row: Row) => rows.push(row)),
  }
}

function setupGlobalMocks(sheetMock: ReturnType<typeof makeSheetMock>) {
  const lock = { waitLock: vi.fn(), releaseLock: vi.fn() }

  vi.stubGlobal('SpreadsheetApp', {
    openById: vi.fn(() => ({
      getSheetByName: vi.fn(() => sheetMock),
    })),
  })
  vi.stubGlobal('LockService', { getScriptLock: vi.fn(() => lock) })
  vi.stubGlobal('Utilities', {
    formatDate: vi.fn(() => '2026/03/17'),
  })
  vi.stubGlobal('HtmlService', {
    createHtmlOutputFromFile: vi.fn(() => ({
      setTitle: vi.fn().mockReturnThis(),
      setXFrameOptionsMode: vi.fn().mockReturnThis(),
    })),
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
  })
}

// ===== Tests =====

describe('getGems', () => {
  it('シートが空のとき空配列を返す', async () => {
    const sheet = makeSheetMock([])
    setupGlobalMocks(sheet)
    const { getGems } = await import('../Code')
    expect(getGems()).toEqual([])
  })

  it('1件のGemを正しくパースして返す', async () => {
    const sheet = makeSheetMock([
      ['gem_001', '議事録作成くん', '会議メモを整形', 'https://example.com', '会議,文書', '田中', '2026/03/17', 5],
    ])
    setupGlobalMocks(sheet)
    const { getGems } = await import('../Code')
    expect(getGems()).toEqual([
      {
        id: 'gem_001',
        name: '議事録作成くん',
        description: '会議メモを整形',
        url: 'https://example.com',
        tags: ['会議', '文書'],
        author: '田中',
        createdAt: '2026/03/17',
        votes: 5,
      },
    ])
  })

  it('タグが空文字のとき空配列になる', async () => {
    const sheet = makeSheetMock([
      ['gem_001', 'テストGem', '', 'https://example.com', '', '佐藤', '2026/03/17', 0],
    ])
    setupGlobalMocks(sheet)
    const { getGems } = await import('../Code')
    const result = getGems() as Array<{ tags: string[] }>
    expect(result[0].tags).toEqual([])
  })

  it('複数件を全件返す', async () => {
    const sheet = makeSheetMock([
      ['gem_001', 'Gem A', '', 'https://a.com', '', '田中', '2026/03/16', 3],
      ['gem_002', 'Gem B', '', 'https://b.com', '', '佐藤', '2026/03/17', 1],
    ])
    setupGlobalMocks(sheet)
    const { getGems } = await import('../Code')
    expect(getGems()).toHaveLength(2)
  })
})

describe('generateId', () => {
  it('シートが空のとき gem_001 を返す', async () => {
    const sheet = makeSheetMock([])
    setupGlobalMocks(sheet)
    const { generateId } = await import('../Code')
    expect(generateId(sheet as never)).toBe('gem_001')
  })

  it('1行あるとき gem_002 を返す', async () => {
    const sheet = makeSheetMock([['gem_001', 'X', '', '', '', '', '', 0]])
    setupGlobalMocks(sheet)
    const { generateId } = await import('../Code')
    expect(generateId(sheet as never)).toBe('gem_002')
  })

  it('9行あるとき gem_010 を返す（ゼロパディング）', async () => {
    const rows = Array.from({ length: 9 }, (_, i) => [`gem_00${i + 1}`, '', '', '', '', '', '', 0])
    const sheet = makeSheetMock(rows)
    setupGlobalMocks(sheet)
    const { generateId } = await import('../Code')
    expect(generateId(sheet as never)).toBe('gem_010')
  })
})

describe('addGem', () => {
  it('シートに1行追加されIDを返す', async () => {
    const sheet = makeSheetMock([])
    setupGlobalMocks(sheet)
    const { addGem } = await import('../Code')
    const result = addGem({ name: 'Gem A', description: '説明', url: 'https://a.com', tags: '会議', author: '田中' })
    expect(result).toEqual({ success: true, id: 'gem_001' })
    expect(sheet._rows).toHaveLength(1)
    expect(sheet._rows[0]).toEqual(['gem_001', 'Gem A', '説明', 'https://a.com', '会議', '田中', '2026/03/17', 0])
  })
})

describe('incrementVote', () => {
  it('対象Gemの👍数が+1されて返る', async () => {
    const sheet = makeSheetMock([
      ['gem_001', 'Gem A', '', 'https://a.com', '', '田中', '2026/03/17', 3],
    ])
    setupGlobalMocks(sheet)
    const { incrementVote } = await import('../Code')
    const result = incrementVote('gem_001') as { success: boolean; votes: number }
    expect(result.success).toBe(true)
    expect(result.votes).toBe(4)
  })

  it('存在しないIDはエラーを返す', async () => {
    const sheet = makeSheetMock([
      ['gem_001', 'Gem A', '', 'https://a.com', '', '田中', '2026/03/17', 3],
    ])
    setupGlobalMocks(sheet)
    const { incrementVote } = await import('../Code')
    const result = incrementVote('gem_999') as { success: boolean }
    expect(result.success).toBe(false)
  })

  it('シートが空のときエラーを返す', async () => {
    const sheet = makeSheetMock([])
    setupGlobalMocks(sheet)
    const { incrementVote } = await import('../Code')
    const result = incrementVote('gem_001') as { success: boolean }
    expect(result.success).toBe(false)
  })
})
