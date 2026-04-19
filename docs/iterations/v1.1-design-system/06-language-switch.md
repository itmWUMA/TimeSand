---
type: task
iteration: "1.1"
status: pending
branch: "feat/language-switch"
pr:
completed:
tags:
  - i18n
  - phase-1
---

# Task 6: Language Switch

- **Branch**: `feat/language-switch`
- **Scope**: Add a language toggle (zh-CN / en) to the sidebar bottom in DefaultLayout. Persist choice to localStorage and update `<html lang>` attribute.
- **Dependencies**: Task 4 (i18n Setup) and Task 5 (i18n Extraction) must be merged first

## Files

### Frontend

- `frontend/src/layouts/DefaultLayout.vue` (modify) — add toggle UI
- `frontend/src/layouts/__tests__/DefaultLayout.spec.ts` (create) — integration test

## Acceptance Criteria

- [ ] Language toggle visible at sidebar bottom (desktop) and mobile menu bottom
- [ ] Click toggles between zh-CN and en instantly (no page reload)
- [ ] Preference persisted to `localStorage` key `ts-locale`
- [ ] `<html lang="...">` attribute updated on switch
- [ ] First visit defaults to browser language detection (zh* → zh-CN, otherwise en)
- [ ] All rendered text updates reactively on locale change
- [ ] Test passes

## Implementation Steps

- [ ] **Step 1: Add locale toggle logic to DefaultLayout**

In `frontend/src/layouts/DefaultLayout.vue`, add the following to `<script setup>`:

```ts
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n()

function toggleLocale(): void {
  const next = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
  locale.value = next
  localStorage.setItem('ts-locale', next)
  document.documentElement.lang = next
}
```

Also set the initial `<html lang>` on mount:

```ts
import { onMounted } from 'vue'

onMounted(() => {
  document.documentElement.lang = locale.value
})
```

- [ ] **Step 2: Add toggle UI to sidebar (desktop)**

In the `<aside>` element, add the toggle at the bottom (after the `<nav>` and before `</aside>`):

```html
<div class="border-t border-white/10 px-4 py-3">
  <button
    type="button"
    class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
    @click="toggleLocale"
  >
    <span class="text-base">🌐</span>
    <span>{{ locale === 'zh-CN' ? '中文 / EN' : 'EN / 中文' }}</span>
  </button>
</div>
```

- [ ] **Step 3: Add toggle UI to mobile menu**

In the mobile `<nav>` section (inside `<header>`), add the toggle at the end (after the nav links, inside the `v-if="mobileOpen"` block):

```html
<button
  type="button"
  class="mt-2 flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-3 py-2 pt-3 text-sm text-ts-muted transition hover:bg-white/10 hover:text-ts-text"
  @click="toggleLocale"
>
  <span class="text-base">🌐</span>
  <span>{{ locale === 'zh-CN' ? '中文 / EN' : 'EN / 中文' }}</span>
</button>
```

- [ ] **Step 4: Write integration test**

Create `frontend/src/layouts/__tests__/DefaultLayout.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it, vi } from 'vitest'

import type { MessageSchema } from '../../i18n/types'
import en from '../../i18n/locales/en'
import zhCN from '../../i18n/locales/zh-CN'
import DefaultLayout from '../DefaultLayout.vue'

function createWrapper(locale: 'zh-CN' | 'en' = 'en') {
  const i18n = createI18n<[MessageSchema], 'zh-CN' | 'en'>({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { 'zh-CN': zhCN, en },
  })

  return mount(DefaultLayout, {
    global: {
      plugins: [i18n],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        RouterView: { template: '<div />' },
        MusicPlayer: { template: '<div />' },
      },
    },
  })
}

describe('language switch', () => {
  it('renders toggle button in sidebar', () => {
    const wrapper = createWrapper()
    const btn = wrapper.find('aside button')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('EN / 中文')
  })

  it('toggles locale on click', async () => {
    const wrapper = createWrapper('en')
    const btn = wrapper.find('aside button')

    await btn.trigger('click')

    expect(btn.text()).toContain('中文 / EN')
    expect(localStorage.getItem('ts-locale')).toBe('zh-CN')
  })

  it('sets html lang attribute on mount', () => {
    createWrapper('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('updates html lang on toggle', async () => {
    const wrapper = createWrapper('en')
    document.documentElement.lang = 'en'

    const btn = wrapper.find('aside button')
    await btn.trigger('click')

    expect(document.documentElement.lang).toBe('zh-CN')
  })
})
```

- [ ] **Step 5: Run tests and verify**

```bash
cd frontend && bun run test
```
Expected: All tests pass including the new language switch tests.

```bash
cd frontend && bun run type-check
```
Expected: No type errors.

```bash
cd frontend && bun run lint:fix
```
Expected: No lint errors.

- [ ] **Step 6: Visual verification**

Start the dev server and verify:
```bash
cd frontend && bun run dev
```

Check:
- Language toggle appears at the bottom of the sidebar
- Clicking toggles all visible text between Chinese and English
- Page does not reload on toggle
- Refreshing the page preserves the language choice
- Opening a new tab detects the saved preference from localStorage

- [ ] **Step 7: Commit**

```bash
git add frontend/src/layouts/ frontend/src/layouts/__tests__/
git commit -m "$(cat <<'EOF'
feat(i18n): add language switch toggle in sidebar

Two-state toggle (zh-CN / en) at sidebar bottom with localStorage
persistence and browser language detection fallback. Updates html
lang attribute for accessibility.
EOF
)"
```

## Tests

### Frontend

- **Render test**: Toggle button appears in sidebar
- **Toggle test**: Click changes locale, persists to localStorage
- **HTML lang test**: `document.documentElement.lang` updates on mount and toggle
- **Visual**: Manual verification of instant text switching
