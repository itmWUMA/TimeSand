---
type: task
iteration: "1.2"
status: done
branch: "feat/memory-text"
pr:
completed: 2026-04-25
tags:
  - core-experience
  - memory-text
  - phase-1
---

# Task 2: Memory Copywriting

- **Branch**: `feat/memory-text`
- **Scope**: Parse the backend `weight_reason` string into human-readable, locale-aware anniversary text. Create a utility function, a reactive composable, and add i18n keys for both locales.
- **Dependencies**: None

## Files

### Frontend

- `frontend/src/utils/parseWeightReason.ts` (create) — pure parser function
- `frontend/src/composables/useMemoryText.ts` (create) — reactive composable wrapping the parser with i18n
- `frontend/src/i18n/locales/zh-CN.ts` (modify) — add `draw.memory` keys
- `frontend/src/i18n/locales/en.ts` (modify) — add `draw.memory` keys

### Tests

- `frontend/src/__tests__/utils/parseWeightReason.test.ts` (create)
- `frontend/src/__tests__/composables/useMemoryText.test.ts` (create)

## Acceptance Criteria

- [ ] `parseWeightReason` correctly parses all patterns: `1_years_ago_today`, `3_years_ago_today`, `1_years_ago_nearby`, `5_years_ago_nearby`, `null`
- [ ] `parseWeightReason` returns `null` for `null`, empty string, and malformed input
- [ ] `useMemoryText` returns reactive locale-aware string matching the copywriting table in spec §3.2
- [ ] Special case: n=1 uses "去年" / "last year" phrasing, not "1 年前" / "1 years ago"
- [ ] i18n keys added to both `zh-CN.ts` and `en.ts` under `draw.memory` namespace
- [ ] Unit tests pass for all patterns in both locales
- [ ] `bun run type-check` passes
- [ ] `bun run lint:fix` passes

## Implementation Steps

- [ ] **Step 1: Write failing tests for `parseWeightReason`**

Create `frontend/src/__tests__/utils/parseWeightReason.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseWeightReason } from '../../utils/parseWeightReason'

describe('parseWeightReason', () => {
  it('returns null for null input', () => {
    expect(parseWeightReason(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseWeightReason('')).toBeNull()
  })

  it('returns null for malformed input', () => {
    expect(parseWeightReason('random_string')).toBeNull()
    expect(parseWeightReason('years_ago_today')).toBeNull()
    expect(parseWeightReason('0_years_ago_today')).toBeNull()
  })

  it('parses "1_years_ago_today"', () => {
    expect(parseWeightReason('1_years_ago_today')).toEqual({ years: 1, type: 'today' })
  })

  it('parses "3_years_ago_today"', () => {
    expect(parseWeightReason('3_years_ago_today')).toEqual({ years: 3, type: 'today' })
  })

  it('parses "1_years_ago_nearby"', () => {
    expect(parseWeightReason('1_years_ago_nearby')).toEqual({ years: 1, type: 'nearby' })
  })

  it('parses "5_years_ago_nearby"', () => {
    expect(parseWeightReason('5_years_ago_nearby')).toEqual({ years: 5, type: 'nearby' })
  })

  it('parses large year values', () => {
    expect(parseWeightReason('20_years_ago_today')).toEqual({ years: 20, type: 'today' })
  })
})
```

Run: `cd frontend && bun run test -- parseWeightReason`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `parseWeightReason`**

Create `frontend/src/utils/parseWeightReason.ts`:

```ts
export interface WeightReasonParsed {
  years: number
  type: 'today' | 'nearby'
}

const PATTERN = /^(\d+)_years_ago_(today|nearby)$/

export function parseWeightReason(reason: string | null): WeightReasonParsed | null {
  if (!reason) return null

  const match = PATTERN.exec(reason)
  if (!match) return null

  const years = Number.parseInt(match[1], 10)
  if (years < 1) return null

  return { years, type: match[2] as 'today' | 'nearby' }
}
```

Run: `cd frontend && bun run test -- parseWeightReason`
Expected: All tests PASS.

- [ ] **Step 3: Add i18n keys**

Add the following keys to the `draw` section in `frontend/src/i18n/locales/zh-CN.ts`:

```ts
// Inside the draw object, add:
memory: {
  lastYearToday: '去年的今天',
  lastYearNearby: '大约去年的这几天',
  yearsAgoToday: '{n} 年前的今天',
  yearsAgoNearby: '大约 {n} 年前的这几天',
},
```

Add the matching keys to `frontend/src/i18n/locales/en.ts`:

```ts
// Inside the draw object, add:
memory: {
  lastYearToday: 'One year ago today',
  lastYearNearby: 'Around this time last year',
  yearsAgoToday: '{n} years ago today',
  yearsAgoNearby: 'Around this time {n} years ago',
},
```

- [ ] **Step 4: Write failing test for `useMemoryText`**

Create `frontend/src/__tests__/composables/useMemoryText.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'draw.memory.lastYearToday': 'One year ago today',
        'draw.memory.lastYearNearby': 'Around this time last year',
        'draw.memory.yearsAgoToday': `${params?.n ?? ''} years ago today`,
        'draw.memory.yearsAgoNearby': `Around this time ${params?.n ?? ''} years ago`,
      }
      return translations[key] ?? key
    },
  }),
}))

import { useMemoryText } from '../../composables/useMemoryText'

describe('useMemoryText', () => {
  it('returns null for null reason', () => {
    const reason = ref<string | null>(null)
    const text = useMemoryText(reason)
    expect(text.value).toBeNull()
  })

  it('returns correct text for 1_years_ago_today', () => {
    const reason = ref<string | null>('1_years_ago_today')
    const text = useMemoryText(reason)
    expect(text.value).toBe('One year ago today')
  })

  it('returns correct text for 3_years_ago_today', () => {
    const reason = ref<string | null>('3_years_ago_today')
    const text = useMemoryText(reason)
    expect(text.value).toBe('3 years ago today')
  })

  it('returns correct text for 1_years_ago_nearby', () => {
    const reason = ref<string | null>('1_years_ago_nearby')
    const text = useMemoryText(reason)
    expect(text.value).toBe('Around this time last year')
  })

  it('returns correct text for 5_years_ago_nearby', () => {
    const reason = ref<string | null>('5_years_ago_nearby')
    const text = useMemoryText(reason)
    expect(text.value).toBe('Around this time 5 years ago')
  })

  it('reacts to reason changes', async () => {
    const reason = ref<string | null>(null)
    const text = useMemoryText(reason)
    expect(text.value).toBeNull()

    reason.value = '2_years_ago_today'
    await nextTick()
    expect(text.value).toBe('2 years ago today')
  })
})
```

Run: `cd frontend && bun run test -- useMemoryText`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `useMemoryText`**

Create `frontend/src/composables/useMemoryText.ts`:

```ts
import type { Ref } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseWeightReason } from '../utils/parseWeightReason'

export function useMemoryText(weightReason: Ref<string | null>): Ref<string | null> {
  const { t } = useI18n()

  return computed(() => {
    const parsed = parseWeightReason(weightReason.value)
    if (!parsed) return null

    if (parsed.years === 1) {
      return parsed.type === 'today'
        ? t('draw.memory.lastYearToday')
        : t('draw.memory.lastYearNearby')
    }

    return parsed.type === 'today'
      ? t('draw.memory.yearsAgoToday', { n: parsed.years })
      : t('draw.memory.yearsAgoNearby', { n: parsed.years })
  })
}
```

Run: `cd frontend && bun run test -- useMemoryText`
Expected: All tests PASS.

- [ ] **Step 6: Verify type-check and lint**

```bash
cd frontend && bun run type-check && bun run lint:fix
```

Expected: Both pass with no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/utils/parseWeightReason.ts frontend/src/composables/useMemoryText.ts frontend/src/i18n/locales/zh-CN.ts frontend/src/i18n/locales/en.ts frontend/src/__tests__/utils/parseWeightReason.test.ts frontend/src/__tests__/composables/useMemoryText.test.ts
git commit -m "$(cat <<'EOF'
feat(memory): add anniversary memory text with locale-aware formatting

Parse backend weight_reason into human-readable text with special
n=1 phrasing. Reactive useMemoryText composable for display in
card draw ceremony.
EOF
)"
```

## Tests

### Frontend

- **`parseWeightReason.test.ts`**: null, empty, malformed, all valid patterns (today/nearby × n=1 and n>1), edge cases
- **`useMemoryText.test.ts`**: null reason, all 4 pattern/locale combinations, reactivity on reason change
