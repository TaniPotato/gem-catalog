// Dev only: google.script.run のモック実装
// npm run dev 時のみ使用される

interface Gem {
  id: string
  name: string
  description: string
  url: string
  tags: string[]
  author: string
  createdAt: string
  votes: number
}

const STORAGE_KEY = 'mock_gems'

const SAMPLE_GEMS: Gem[] = [
  {
    id: 'gem_001',
    name: '議事録作成くん',
    description: '会議メモから議事録を自動整形してくれるGem。箇条書きで渡すだけでOK',
    url: 'https://gemini.google.com/',
    tags: ['会議', '文書作成'],
    author: '田中',
    createdAt: '2026/03/15',
    votes: 12,
  },
  {
    id: 'gem_002',
    name: 'コードレビュアー',
    description: 'PRの差分を貼り付けるとレビューコメントを出してくれる',
    url: 'https://gemini.google.com/',
    tags: ['開発', 'レビュー'],
    author: '佐藤',
    createdAt: '2026/03/16',
    votes: 8,
  },
  {
    id: 'gem_003',
    name: 'データ分析くん',
    description: 'CSVを渡すと傾向と示唆をまとめてくれる',
    url: 'https://gemini.google.com/',
    tags: ['分析', 'データ'],
    author: '鈴木',
    createdAt: '2026/03/17',
    votes: 5,
  },
]

function load(): Gem[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    save(SAMPLE_GEMS)
    return SAMPLE_GEMS
  }
  return JSON.parse(raw) as Gem[]
}

function save(gems: Gem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gems))
}

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// google.script.run の fluent API を再現
function makeRunner(successHandler: (v: unknown) => void, failureHandler: (e: Error) => void) {
  return {
    getGems: async () => {
      await delay()
      successHandler(load())
    },
    addGem: async (data: { name: string; description: string; url: string; tags: string; author: string }) => {
      await delay()
      const gems = load()
      const id = `gem_${String(gems.length + 1).padStart(3, '0')}`
      const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
      gems.push({ id, ...data, tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [], createdAt: today, votes: 0 })
      save(gems)
      successHandler({ success: true, id })
    },
    updateGem: async (gemId: string, data: { name: string; description: string; url: string; tags: string; author: string }) => {
      await delay()
      const gems = load()
      const gem = gems.find((g) => g.id === gemId)
      if (!gem) { failureHandler(new Error('Gem not found')); return }
      gem.name = data.name
      gem.description = data.description
      gem.url = data.url
      gem.tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      gem.author = data.author
      save(gems)
      successHandler({ success: true })
    },
    incrementVote: async (gemId: string) => {
      await delay()
      const gems = load()
      const gem = gems.find((g) => g.id === gemId)
      if (!gem) { failureHandler(new Error('Gem not found')); return }
      gem.votes += 1
      save(gems)
      successHandler({ success: true, votes: gem.votes })
    },
  }
}

export function setupMockGas(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).google = {
    script: {
      run: {
        withSuccessHandler(fn: (v: unknown) => void) {
          return {
            withFailureHandler(errFn: (e: Error) => void) {
              return makeRunner(fn, errFn)
            },
            ...makeRunner(fn, console.error),
          }
        },
        withFailureHandler() {
          return this
        },
      },
    },
  }
  console.info('[mock-gas] google.script.run をモックしました（ローカル開発用）')
}
