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

// GAS google.script.run types
declare const google: {
  script: {
    run: {
      withSuccessHandler: (fn: (result: unknown) => void) => typeof google.script.run
      withFailureHandler: (fn: (err: Error) => void) => typeof google.script.run
      getGems: () => void
      addGem: (data: object) => void
      incrementVote: (gemId: string) => void
    }
  }
}

// ===== State =====
let allGems: Gem[] = []
let currentTag = ''
let currentSort: 'new' | 'popular' = 'new'

// ===== DOM references =====
const searchInput = document.getElementById('searchInput') as HTMLInputElement
const tagFilters = document.getElementById('tagFilters') as HTMLDivElement
const cardGrid = document.getElementById('cardGrid') as HTMLDivElement
const loadingEl = document.getElementById('loading') as HTMLDivElement
const emptyState = document.getElementById('emptyState') as HTMLDivElement
const modalOverlay = document.getElementById('modalOverlay') as HTMLDivElement
const openModalBtn = document.getElementById('openModalBtn') as HTMLButtonElement
const closeModalBtn = document.getElementById('closeModalBtn') as HTMLButtonElement
const cancelModalBtn = document.getElementById('cancelModalBtn') as HTMLButtonElement
const registerForm = document.getElementById('registerForm') as HTMLFormElement
const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement
const sortNewBtn = document.getElementById('sortNew') as HTMLButtonElement
const sortPopularBtn = document.getElementById('sortPopular') as HTMLButtonElement

// ===== LocalStorage helpers =====
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

  tagFilters.innerHTML = `<button class="tag-btn ${currentTag === '' ? 'active' : ''}" data-tag="">全て</button>`
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
  if (currentSort === 'popular') {
    result = [...result].sort((a, b) => b.votes - a.votes)
  } else {
    result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return result
}

function renderCards(gems: Gem[]): void {
  cardGrid.innerHTML = ''
  emptyState.hidden = gems.length > 0

  gems.forEach(gem => {
    const voted = isVoted(gem.id)
    const card = document.createElement('div')
    card.className = 'gem-card'
    card.dataset.id = gem.id
    card.innerHTML = `
      <div class="card-top">
        <span class="card-name">🤖 ${escapeHtml(gem.name)}</span>
        <span class="card-votes">👍 ${gem.votes}</span>
      </div>
      <p class="card-description">${escapeHtml(gem.description || '')}</p>
      <div class="card-tags">
        ${gem.tags.map(t => `<span class="card-tag">#${escapeHtml(t)}</span>`).join('')}
      </div>
      <div class="card-footer">
        <span class="card-author">登録者：${escapeHtml(gem.author)}</span>
        <div class="card-actions">
          <button
            class="btn-vote${voted ? ' voted' : ''}"
            data-id="${gem.id}"
            ${voted ? 'disabled' : ''}
          >${voted ? '✓ 投票済み' : '👍 便利！'}</button>
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

// ===== Load Gems =====
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
  const btn = (e.target as HTMLElement).closest('.btn-vote') as HTMLButtonElement | null
  if (!btn || btn.disabled) return

  const gemId = btn.dataset.id!
  btn.disabled = true
  btn.textContent = '...'

  google.script.run
    .withSuccessHandler((result: unknown) => {
      const res = result as { success: boolean; votes: number }
      if (res.success) {
        markVoted(gemId)
        const card = cardGrid.querySelector(`.gem-card[data-id="${gemId}"]`)
        if (card) {
          const votesEl = card.querySelector('.card-votes')!
          votesEl.textContent = `👍 ${res.votes}`
          const gem = allGems.find(g => g.id === gemId)
          if (gem) gem.votes = res.votes
        }
        btn.textContent = '✓ 投票済み'
        btn.classList.add('voted')
      } else {
        btn.disabled = false
        btn.textContent = '👍 便利！'
      }
    })
    .withFailureHandler(() => {
      btn.disabled = false
      btn.textContent = '👍 便利！'
    })
    .incrementVote(gemId)
})

// ===== Modal =====
function openModal(): void {
  modalOverlay.hidden = false
  ;(document.getElementById('gemName') as HTMLInputElement).focus()
}
function closeModal(): void {
  modalOverlay.hidden = true
  registerForm.reset()
  clearErrors()
}

openModalBtn.addEventListener('click', openModal)
closeModalBtn.addEventListener('click', closeModal)
cancelModalBtn.addEventListener('click', closeModal)
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal()
})

// ===== Form validation =====
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

  const name = document.getElementById('gemName') as HTMLInputElement
  const url = document.getElementById('gemUrl') as HTMLInputElement
  const author = document.getElementById('gemAuthor') as HTMLInputElement

  if (!name.value.trim()) {
    showError('gemName', 'Gem名は必須です')
    valid = false
  }
  if (!url.value.trim()) {
    showError('gemUrl', 'URLは必須です')
    valid = false
  }
  if (!author.value.trim()) {
    showError('gemAuthor', '作成者は必須です')
    valid = false
  }
  return valid
}

function showError(fieldId: string, msg: string): void {
  const input = document.getElementById(fieldId) as HTMLInputElement
  const error = document.getElementById(`${fieldId}Error`) as HTMLSpanElement
  input.classList.add('has-error')
  error.textContent = msg
}

// ===== Register =====
registerForm.addEventListener('submit', (e) => {
  e.preventDefault()
  if (!validate()) return

  submitBtn.disabled = true
  submitBtn.textContent = '登録中...'

  const data = {
    name: (document.getElementById('gemName') as HTMLInputElement).value.trim(),
    description: (document.getElementById('gemDescription') as HTMLTextAreaElement).value.trim(),
    url: (document.getElementById('gemUrl') as HTMLInputElement).value.trim(),
    tags: (document.getElementById('gemTags') as HTMLInputElement).value.trim(),
    author: (document.getElementById('gemAuthor') as HTMLInputElement).value.trim(),
  }

  google.script.run
    .withSuccessHandler(() => {
      submitBtn.disabled = false
      submitBtn.textContent = '登録する ✓'
      closeModal()
      loadGems()
    })
    .withFailureHandler(() => {
      submitBtn.disabled = false
      submitBtn.textContent = '登録する ✓'
      alert('登録に失敗しました。もう一度お試しください。')
    })
    .addGem(data)
})

// ===== Init =====
loadGems()
