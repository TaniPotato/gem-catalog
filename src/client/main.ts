// ===== Dev mock =====
if (import.meta.env.DEV) {
  const { setupMockGas } = await import('./mock-gas')
  setupMockGas()
}

// ===== Types =====
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

declare const google: {
  script: {
    run: {
      withSuccessHandler: (fn: (result: unknown) => void) => typeof google.script.run
      withFailureHandler: (fn: (err: Error) => void) => typeof google.script.run
      getGems: () => void
      addGem: (data: object) => void
      updateGem: (gemId: string, data: object) => void
      incrementVote: (gemId: string) => void
    }
  }
}

// ===== State =====
let allGems: Gem[] = []
let currentTag = ''
let currentSort: 'new' | 'popular' = 'new'
let editingGemId: string | null = null

// ===== DOM =====
const searchInput   = document.getElementById('searchInput')    as HTMLInputElement
const tagFilters    = document.getElementById('tagFilters')     as HTMLDivElement
const cardGrid      = document.getElementById('cardGrid')       as HTMLDivElement
const loadingEl     = document.getElementById('loading')        as HTMLDivElement
const emptyState    = document.getElementById('emptyState')     as HTMLDivElement
const sectionCount  = document.getElementById('sectionCount')   as HTMLSpanElement
const modalOverlay  = document.getElementById('modalOverlay')   as HTMLDivElement
const modalTitle    = document.getElementById('modalTitle')     as HTMLHeadingElement
const openModalBtn  = document.getElementById('openModalBtn')   as HTMLButtonElement
const closeModalBtn = document.getElementById('closeModalBtn')  as HTMLButtonElement
const cancelModalBtn= document.getElementById('cancelModalBtn') as HTMLButtonElement
const registerForm  = document.getElementById('registerForm')   as HTMLFormElement
const submitBtn     = document.getElementById('submitBtn')      as HTMLButtonElement
const sortNewBtn    = document.getElementById('sortNew')        as HTMLButtonElement
const sortPopularBtn= document.getElementById('sortPopular')    as HTMLButtonElement

// ===== TagInput =====
class TagInput {
  private tags: string[] = []
  private chips = document.getElementById('tagChips')!
  private textInput = document.getElementById('tagTextInput') as HTMLInputElement
  private hidden = document.getElementById('gemTags') as HTMLInputElement
  private field = document.getElementById('tagInputField')!

  constructor() {
    this.field.addEventListener('click', () => this.textInput.focus())
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        this.addTag(this.textInput.value)
      }
      if (e.key === 'Backspace' && this.textInput.value === '' && this.tags.length) {
        this.removeTag(this.tags[this.tags.length - 1])
      }
    })
  }

  addTag(raw: string): void {
    const tag = raw.trim().replace(/,$/, '')
    if (!tag || this.tags.includes(tag)) { this.textInput.value = ''; return }
    this.tags.push(tag)
    this.textInput.value = ''
    this.render()
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag)
    this.render()
  }

  setTags(tags: string[]): void {
    this.tags = [...tags]
    this.textInput.value = ''
    this.render()
  }

  getValue(): string {
    return this.tags.join(',')
  }

  private render(): void {
    this.chips.innerHTML = ''
    this.tags.forEach(tag => {
      const chip = document.createElement('span')
      chip.className = 'tag-chip'
      chip.innerHTML = `${escapeHtml(tag)}<button type="button" class="tag-chip-remove" aria-label="削除">✕</button>`
      chip.querySelector('button')!.addEventListener('click', () => this.removeTag(tag))
      this.chips.appendChild(chip)
    })
    this.hidden.value = this.getValue()
  }
}

const tagInput = new TagInput()

// ===== LocalStorage =====
function isVoted(gemId: string): boolean {
  return localStorage.getItem(`voted_${gemId}`) === '1'
}
function markVoted(gemId: string): void {
  localStorage.setItem(`voted_${gemId}`, '1')
}

// ===== Render =====
function renderTagFilters(gems: Gem[]): void {
  const tagSet = new Set<string>()
  gems.forEach(g => g.tags.forEach(t => tagSet.add(t)))
  const tags = Array.from(tagSet).sort()

  tagFilters.innerHTML = `<button class="tag-btn ${currentTag === '' ? 'active' : ''}" data-tag="">すべて</button>`
  tags.forEach(tag => {
    const btn = document.createElement('button')
    btn.className = `tag-btn${currentTag === tag ? ' active' : ''}`
    btn.dataset.tag = tag
    btn.textContent = tag
    tagFilters.appendChild(btn)
  })
}

function filterAndSort(gems: Gem[]): Gem[] {
  const keyword = searchInput.value.trim().toLowerCase()
  let result = gems

  if (keyword) {
    result = result.filter(g =>
      g.name.toLowerCase().includes(keyword) ||
      g.description.toLowerCase().includes(keyword)
    )
  }
  if (currentTag) {
    result = result.filter(g => g.tags.includes(currentTag))
  }
  return currentSort === 'popular'
    ? [...result].sort((a, b) => b.votes - a.votes)
    : [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function renderCards(gems: Gem[]): void {
  cardGrid.innerHTML = ''
  cardGrid.appendChild(emptyState)
  emptyState.hidden = gems.length > 0
  sectionCount.textContent = gems.length > 0 ? `${gems.length} 件` : ''

  gems.forEach(gem => {
    const voted = isVoted(gem.id)
    const card = document.createElement('div')
    card.className = 'gem-card'
    card.dataset.id = gem.id
    card.innerHTML = `
      <div class="card-top">
        <span class="card-name">${escapeHtml(gem.name)}</span>
        <span class="card-votes-badge">👍 ${gem.votes}</span>
      </div>
      ${gem.description ? `<p class="card-description">${escapeHtml(gem.description)}</p>` : ''}
      ${gem.tags.length ? `<div class="card-tags">${gem.tags.map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="card-footer">
        <span class="card-author">${escapeHtml(gem.author)}</span>
        <div class="card-actions">
          <button
            class="btn-vote${voted ? ' voted' : ''}"
            data-id="${gem.id}"
            ${voted ? 'disabled' : ''}
          >${voted ? '✓ 済み' : '👍 便利！'}</button>
          <a href="${escapeHtml(gem.url)}" target="_blank" rel="noopener noreferrer" class="btn-open">開く →</a>
        </div>
      </div>
    `
    cardGrid.appendChild(card)
  })
}

function refresh(): void {
  renderCards(filterAndSort(allGems))
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ===== Load =====
function loadGems(): void {
  loadingEl.hidden = false
  cardGrid.innerHTML = ''
  emptyState.hidden = true

  google.script.run
    .withSuccessHandler((data: unknown) => {
      allGems = data as Gem[]
      loadingEl.hidden = true
      renderTagFilters(allGems)
      refresh()
    })
    .withFailureHandler(() => {
      loadingEl.textContent = 'データの読み込みに失敗しました。ページを再読み込みしてください。'
    })
    .getGems()
}

// ===== Search =====
searchInput.addEventListener('input', refresh)

// ===== Tag filter =====
tagFilters.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.tag-btn') as HTMLButtonElement | null
  if (!btn) return
  currentTag = btn.dataset.tag ?? ''
  tagFilters.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  refresh()
})

// ===== Sort =====
sortNewBtn.addEventListener('click', () => {
  currentSort = 'new'
  sortNewBtn.classList.add('active')
  sortPopularBtn.classList.remove('active')
  refresh()
})
sortPopularBtn.addEventListener('click', () => {
  currentSort = 'popular'
  sortPopularBtn.classList.add('active')
  sortNewBtn.classList.remove('active')
  refresh()
})

// ===== Vote =====
cardGrid.addEventListener('click', (e) => {
  const target = e.target as HTMLElement

  // 👍 ボタン
  const voteBtn = target.closest('.btn-vote') as HTMLButtonElement | null
  if (voteBtn) {
    if (voteBtn.disabled) return
    const gemId = voteBtn.dataset.id!
    voteBtn.disabled = true
    voteBtn.textContent = '...'

    google.script.run
      .withSuccessHandler((result: unknown) => {
        const res = result as { success: boolean; votes: number }
        if (res.success) {
          markVoted(gemId)
          const card = cardGrid.querySelector(`.gem-card[data-id="${gemId}"]`)
          if (card) {
            card.querySelector('.card-votes-badge')!.textContent = `👍 ${res.votes}`
            const gem = allGems.find(g => g.id === gemId)
            if (gem) gem.votes = res.votes
          }
          voteBtn.textContent = '✓ 済み'
          voteBtn.classList.add('voted')
        } else {
          voteBtn.disabled = false
          voteBtn.textContent = '👍 便利！'
        }
      })
      .withFailureHandler(() => {
        voteBtn.disabled = false
        voteBtn.textContent = '👍 便利！'
      })
      .incrementVote(gemId)
    return
  }

  // 「開く」リンクはそのまま
  if (target.closest('.btn-open')) return

  // カードクリック → 編集モーダル
  const card = target.closest('.gem-card') as HTMLElement | null
  if (!card) return
  const gemId = card.dataset.id!
  const gem = allGems.find(g => g.id === gemId)
  if (gem) openModal(gem)
})

// ===== Modal =====
function fillForm(gem?: Gem): void {
  const name        = document.getElementById('gemName')        as HTMLInputElement
  const description = document.getElementById('gemDescription') as HTMLTextAreaElement
  const url         = document.getElementById('gemUrl')         as HTMLInputElement
  const author      = document.getElementById('gemAuthor')      as HTMLInputElement

  name.value        = gem?.name        ?? ''
  description.value = gem?.description ?? ''
  url.value         = gem?.url         ?? ''
  author.value      = gem?.author      ?? ''
  tagInput.setTags(gem?.tags ?? [])
}

function openModal(gem?: Gem): void {
  editingGemId = gem?.id ?? null
  modalTitle.textContent = gem ? 'Gemを編集' : '新しいGemを登録'
  submitBtn.textContent  = gem ? '保存する'  : '登録する'
  fillForm(gem)
  clearErrors()
  modalOverlay.hidden = false
  ;(document.getElementById('gemName') as HTMLInputElement).focus()
}

function closeModal(): void {
  modalOverlay.hidden = true
  editingGemId = null
  registerForm.reset()
  tagInput.setTags([])
  clearErrors()
}

openModalBtn.addEventListener('click',  () => openModal())
closeModalBtn.addEventListener('click', closeModal)
cancelModalBtn.addEventListener('click', closeModal)
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal() })

// ===== Validation =====
function clearErrors(): void {
  ;['gemName', 'gemUrl', 'gemAuthor'].forEach(field => {
    const input = document.getElementById(field) as HTMLInputElement
    const error = document.getElementById(`${field}Error`) as HTMLSpanElement
    input.classList.remove('has-error')
    error.textContent = ''
  })
}

function validate(): boolean {
  clearErrors()
  let valid = true
  const checks: [string, string][] = [
    ['gemName',   'Gem名は必須です'],
    ['gemUrl',    'URLは必須です'],
    ['gemAuthor', '作成者は必須です'],
  ]
  checks.forEach(([id, msg]) => {
    const input = document.getElementById(id) as HTMLInputElement
    if (!input.value.trim()) { showError(id, msg); valid = false }
  })
  return valid
}

function showError(fieldId: string, msg: string): void {
  const input = document.getElementById(fieldId) as HTMLInputElement
  const error = document.getElementById(`${fieldId}Error`) as HTMLSpanElement
  input.classList.add('has-error')
  error.textContent = msg
}

// ===== Submit (register / edit) =====
registerForm.addEventListener('submit', (e) => {
  e.preventDefault()
  if (!validate()) return

  submitBtn.disabled = true
  submitBtn.textContent = '送信中...'

  const data = {
    name:        (document.getElementById('gemName')        as HTMLInputElement).value.trim(),
    description: (document.getElementById('gemDescription') as HTMLTextAreaElement).value.trim(),
    url:         (document.getElementById('gemUrl')         as HTMLInputElement).value.trim(),
    tags:        tagInput.getValue(),
    author:      (document.getElementById('gemAuthor')      as HTMLInputElement).value.trim(),
  }

  const onSuccess = () => {
    submitBtn.disabled = false
    submitBtn.textContent = editingGemId ? '保存する' : '登録する'
    closeModal()
    loadGems()
  }
  const onFailure = () => {
    submitBtn.disabled = false
    submitBtn.textContent = editingGemId ? '保存する' : '登録する'
    alert('送信に失敗しました。もう一度お試しください。')
  }

  if (editingGemId) {
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .updateGem(editingGemId, data)
  } else {
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .addGem(data)
  }
})

// ===== Init =====
loadGems()
