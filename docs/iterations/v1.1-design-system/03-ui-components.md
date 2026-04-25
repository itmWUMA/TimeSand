---
type: task
iteration: "1.1"
status: done
branch: "feat/ui-components"
pr:
completed: 2026-04-25
tags:
  - design-system
  - phase-1
---

# Task 3: UI Component Library

- **Branch**: `feat/ui-components`
- **Scope**: Build 10 base UI components + 1 provider in `components/ui/`, using Radix Vue (headless), design tokens (Tailwind classes), and motion presets. All components tested in isolation.
- **Dependencies**: Task 1 (Design Tokens) and Task 2 (Motion Presets) must be merged first

## Files

### Frontend — Components (create)

- `frontend/src/components/ui/TsButton.vue`
- `frontend/src/components/ui/TsIconButton.vue`
- `frontend/src/components/ui/TsCard.vue`
- `frontend/src/components/ui/TsBadge.vue`
- `frontend/src/components/ui/TsInput.vue`
- `frontend/src/components/ui/TsSelect.vue`
- `frontend/src/components/ui/TsTabs.vue`
- `frontend/src/components/ui/TsDialog.vue`
- `frontend/src/components/ui/TsToast.vue`
- `frontend/src/components/ui/TsToastProvider.vue`
- `frontend/src/components/ui/TsTooltip.vue`
- `frontend/src/components/ui/index.ts` (barrel export)

### Frontend — Tests (create)

- `frontend/src/components/ui/__tests__/TsButton.spec.ts`
- `frontend/src/components/ui/__tests__/TsIconButton.spec.ts`
- `frontend/src/components/ui/__tests__/TsCard.spec.ts`
- `frontend/src/components/ui/__tests__/TsBadge.spec.ts`
- `frontend/src/components/ui/__tests__/TsInput.spec.ts`
- `frontend/src/components/ui/__tests__/TsSelect.spec.ts`
- `frontend/src/components/ui/__tests__/TsTabs.spec.ts`
- `frontend/src/components/ui/__tests__/TsDialog.spec.ts`
- `frontend/src/components/ui/__tests__/TsToast.spec.ts`
- `frontend/src/components/ui/__tests__/TsTooltip.spec.ts`

## Acceptance Criteria

- [x] All 11 components created in `components/ui/`
- [x] Each component uses design tokens via Tailwind classes (`bg-ts-*`, `rounded-ts-*`, etc.)
- [x] Radix-based components use correct Radix Vue primitives
- [x] Entrance/exit animations use motion preset functions
- [x] TsButton supports 3 variants (`primary`, `secondary`, `ghost`) and 3 sizes (`sm`, `md`, `lg`)
- [x] All 10 test files pass
- [x] `bun run type-check` passes
- [x] `bun run lint:fix` passes

## Implementation Steps

### Group A: Simple Native Components

- [ ] **Step 1: Create TsButton**

Create `frontend/src/components/ui/TsButton.vue`:

```vue
<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const variantClasses: Record<string, string> = {
  primary: 'bg-ts-accent text-black hover:brightness-110 shadow-glow-soft',
  secondary: 'border border-ts-accent text-ts-accent bg-transparent hover:bg-ts-accent/10',
  ghost: 'text-ts-text bg-transparent hover:bg-white/10',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-ts-sm',
  md: 'px-4 py-2 text-sm rounded-ts-md',
  lg: 'px-6 py-3 text-base rounded-ts-md',
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center font-semibold transition duration-fast disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variantClasses[variant], sizeClasses[size]]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
```

- [ ] **Step 2: Write TsButton test**

Create `frontend/src/components/ui/__tests__/TsButton.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsButton from '../TsButton.vue'

describe('tsButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(TsButton, { slots: { default: 'Click me' } })
    expect(wrapper.text()).toBe('Click me')
  })

  it('applies primary variant by default', () => {
    const wrapper = mount(TsButton)
    expect(wrapper.classes()).toContain('bg-ts-accent')
  })

  it('applies secondary variant', () => {
    const wrapper = mount(TsButton, { props: { variant: 'secondary' } })
    expect(wrapper.classes()).toContain('border-ts-accent')
  })

  it('applies ghost variant', () => {
    const wrapper = mount(TsButton, { props: { variant: 'ghost' } })
    expect(wrapper.classes()).toContain('hover:bg-white/10')
  })

  it('applies size classes', () => {
    const sm = mount(TsButton, { props: { size: 'sm' } })
    expect(sm.classes()).toContain('text-xs')
    const lg = mount(TsButton, { props: { size: 'lg' } })
    expect(lg.classes()).toContain('text-base')
  })

  it('is disabled when prop is true', () => {
    const wrapper = mount(TsButton, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('emits click event', async () => {
    const wrapper = mount(TsButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run test to verify**

```bash
cd frontend && bun run test -- TsButton
```
Expected: All TsButton tests pass.

- [ ] **Step 4: Create TsIconButton**

Create `frontend/src/components/ui/TsIconButton.vue`:

```vue
<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  label: string
}>(), {
  variant: 'ghost',
  size: 'md',
  disabled: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

const variantClasses: Record<string, string> = {
  primary: 'bg-ts-accent text-black hover:brightness-110',
  secondary: 'border border-ts-accent text-ts-accent bg-transparent hover:bg-ts-accent/10',
  ghost: 'text-ts-muted bg-transparent hover:bg-white/10 hover:text-ts-text',
}

const sizeClasses: Record<string, string> = {
  sm: 'h-7 w-7 text-xs rounded-ts-sm',
  md: 'h-9 w-9 text-sm rounded-ts-sm',
  lg: 'h-11 w-11 text-base rounded-ts-md',
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center transition duration-fast disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variantClasses[variant], sizeClasses[size]]"
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
```

- [ ] **Step 5: Write TsIconButton test**

Create `frontend/src/components/ui/__tests__/TsIconButton.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsIconButton from '../TsIconButton.vue'

describe('tsIconButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(TsIconButton, {
      props: { label: 'Close' },
      slots: { default: '✕' },
    })
    expect(wrapper.text()).toBe('✕')
  })

  it('sets aria-label and title from label prop', () => {
    const wrapper = mount(TsIconButton, { props: { label: 'Close' } })
    expect(wrapper.attributes('aria-label')).toBe('Close')
    expect(wrapper.attributes('title')).toBe('Close')
  })

  it('applies ghost variant by default', () => {
    const wrapper = mount(TsIconButton, { props: { label: 'Test' } })
    expect(wrapper.classes()).toContain('text-ts-muted')
  })

  it('is square shaped', () => {
    const wrapper = mount(TsIconButton, { props: { label: 'Test', size: 'md' } })
    expect(wrapper.classes()).toContain('h-9')
    expect(wrapper.classes()).toContain('w-9')
  })
})
```

- [ ] **Step 6: Create TsCard**

Create `frontend/src/components/ui/TsCard.vue`:

```vue
<script setup lang="ts">
import { useSlots } from 'vue'

const slots = useSlots()
</script>

<template>
  <div class="overflow-hidden rounded-ts-lg border border-ts-border bg-ts-panel shadow-ts-sm">
    <div v-if="slots.header" class="border-b border-ts-border px-4 py-3">
      <slot name="header" />
    </div>
    <div class="p-4">
      <slot />
    </div>
    <div v-if="slots.footer" class="border-t border-ts-border px-4 py-3">
      <slot name="footer" />
    </div>
  </div>
</template>
```

- [ ] **Step 7: Write TsCard test**

Create `frontend/src/components/ui/__tests__/TsCard.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsCard from '../TsCard.vue'

describe('tsCard', () => {
  it('renders default slot content', () => {
    const wrapper = mount(TsCard, { slots: { default: 'Card body' } })
    expect(wrapper.text()).toContain('Card body')
  })

  it('renders header slot when provided', () => {
    const wrapper = mount(TsCard, {
      slots: { header: 'Header', default: 'Body' },
    })
    expect(wrapper.text()).toContain('Header')
  })

  it('renders footer slot when provided', () => {
    const wrapper = mount(TsCard, {
      slots: { footer: 'Footer', default: 'Body' },
    })
    expect(wrapper.text()).toContain('Footer')
  })

  it('hides header/footer when slots not provided', () => {
    const wrapper = mount(TsCard, { slots: { default: 'Body' } })
    const borders = wrapper.findAll('.border-b, .border-t')
    expect(borders.length).toBeLessThanOrEqual(0)
  })

  it('has design token classes', () => {
    const wrapper = mount(TsCard, { slots: { default: 'Body' } })
    expect(wrapper.classes()).toContain('bg-ts-panel')
    expect(wrapper.classes()).toContain('rounded-ts-lg')
  })
})
```

- [ ] **Step 8: Create TsBadge**

Create `frontend/src/components/ui/TsBadge.vue`:

```vue
<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error'
}>(), {
  variant: 'default',
})

const variantClasses: Record<string, string> = {
  default: 'bg-white/10 text-ts-text',
  accent: 'bg-ts-accent/20 text-ts-accent',
  success: 'bg-green-500/20 text-green-300',
  warning: 'bg-yellow-500/20 text-yellow-300',
  error: 'bg-red-500/20 text-red-300',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-ts-full px-2.5 py-0.5 text-xs font-medium"
    :class="variantClasses[variant]"
  >
    <slot />
  </span>
</template>
```

- [ ] **Step 9: Write TsBadge test**

Create `frontend/src/components/ui/__tests__/TsBadge.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsBadge from '../TsBadge.vue'

describe('tsBadge', () => {
  it('renders slot content', () => {
    const wrapper = mount(TsBadge, { slots: { default: 'New' } })
    expect(wrapper.text()).toBe('New')
  })

  it('applies default variant', () => {
    const wrapper = mount(TsBadge)
    expect(wrapper.classes()).toContain('bg-white/10')
  })

  it('applies accent variant', () => {
    const wrapper = mount(TsBadge, { props: { variant: 'accent' } })
    expect(wrapper.classes()).toContain('text-ts-accent')
  })

  it('applies error variant', () => {
    const wrapper = mount(TsBadge, { props: { variant: 'error' } })
    expect(wrapper.classes()).toContain('text-red-300')
  })
})
```

- [ ] **Step 10: Commit Group A**

```bash
git add frontend/src/components/ui/TsButton.vue frontend/src/components/ui/TsIconButton.vue frontend/src/components/ui/TsCard.vue frontend/src/components/ui/TsBadge.vue frontend/src/components/ui/__tests__/
git commit -m "$(cat <<'EOF'
feat(ui): add TsButton, TsIconButton, TsCard, TsBadge components

Simple native-based components with design token styling, variant
and size props, and slot-based composition.
EOF
)"
```

### Group B: Form Components

- [ ] **Step 11: Create TsInput**

Create `frontend/src/components/ui/TsInput.vue`:

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  type?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  label: undefined,
  placeholder: undefined,
  error: undefined,
  type: 'text',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm text-ts-muted">
      {{ label }}
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full rounded-ts-sm border bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none transition duration-fast placeholder:text-ts-muted/60"
      :class="[
        error
          ? 'border-red-400/60 focus:border-red-400'
          : 'border-ts-border focus:border-ts-accent',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ]"
      @input="onInput"
    >
    <p v-if="error" class="text-xs text-red-300">
      {{ error }}
    </p>
  </div>
</template>
```

- [ ] **Step 12: Write TsInput test**

Create `frontend/src/components/ui/__tests__/TsInput.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsInput from '../TsInput.vue'

describe('tsInput', () => {
  it('renders input element', () => {
    const wrapper = mount(TsInput)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('renders label when provided', () => {
    const wrapper = mount(TsInput, { props: { label: 'Name' } })
    expect(wrapper.find('label').text()).toBe('Name')
  })

  it('hides label when not provided', () => {
    const wrapper = mount(TsInput)
    expect(wrapper.find('label').exists()).toBe(false)
  })

  it('shows error message', () => {
    const wrapper = mount(TsInput, { props: { error: 'Required' } })
    expect(wrapper.text()).toContain('Required')
    expect(wrapper.find('input').classes()).toContain('border-red-400/60')
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(TsInput)
    await wrapper.find('input').setValue('hello')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['hello'])
  })

  it('sets placeholder', () => {
    const wrapper = mount(TsInput, { props: { placeholder: 'Enter...' } })
    expect(wrapper.find('input').attributes('placeholder')).toBe('Enter...')
  })
})
```

- [ ] **Step 13: Create TsSelect**

Create `frontend/src/components/ui/TsSelect.vue`:

```vue
<script setup lang="ts">
import {
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'radix-vue'

defineProps<{
  modelValue?: string
  placeholder?: string
  options: Array<{ value: string, label: string }>
  label?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm text-ts-muted">
      {{ label }}
    </label>
    <SelectRoot
      :model-value="modelValue"
      :disabled="disabled"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <SelectTrigger
        class="inline-flex w-full items-center justify-between rounded-ts-sm border border-ts-border bg-ts-panelSoft px-3 py-2 text-sm text-ts-text outline-none transition duration-fast focus:border-ts-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SelectValue :placeholder="placeholder ?? ''" />
        <span class="ml-2 text-ts-muted">▾</span>
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          class="z-dropdown overflow-hidden rounded-ts-md border border-ts-border bg-ts-panel shadow-ts-md"
          position="popper"
          :side-offset="4"
        >
          <SelectViewport class="p-1">
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              class="cursor-pointer rounded-ts-sm px-3 py-2 text-sm text-ts-text outline-none transition duration-fast hover:bg-ts-accent/10 data-[highlighted]:bg-ts-accent/10 data-[state=checked]:text-ts-accent"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
  </div>
</template>
```

- [ ] **Step 14: Write TsSelect test**

Create `frontend/src/components/ui/__tests__/TsSelect.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsSelect from '../TsSelect.vue'

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('tsSelect', () => {
  it('renders trigger button', () => {
    const wrapper = mount(TsSelect, { props: { options } })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('renders label when provided', () => {
    const wrapper = mount(TsSelect, { props: { options, label: 'Choice' } })
    expect(wrapper.find('label').text()).toBe('Choice')
  })

  it('sets placeholder on trigger', () => {
    const wrapper = mount(TsSelect, {
      props: { options, placeholder: 'Pick one' },
    })
    expect(wrapper.text()).toContain('Pick one')
  })

  it('applies disabled state', () => {
    const wrapper = mount(TsSelect, { props: { options, disabled: true } })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
```

- [ ] **Step 15: Create TsTabs**

Create `frontend/src/components/ui/TsTabs.vue`:

```vue
<script setup lang="ts">
import {
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from 'radix-vue'

defineProps<{
  modelValue?: string
  tabs: Array<{ value: string, label: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <TabsRoot
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <TabsList class="relative flex border-b border-ts-border">
      <TabsTrigger
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="relative px-4 py-2.5 text-sm text-ts-muted outline-none transition duration-fast hover:text-ts-text data-[state=active]:text-ts-accent"
      >
        {{ tab.label }}
      </TabsTrigger>
      <TabsIndicator
        class="absolute bottom-0 left-0 h-0.5 bg-ts-accent transition-all duration-normal"
      />
    </TabsList>

    <div class="pt-4">
      <TabsContent
        v-for="tab in tabs"
        :key="`content-${tab.value}`"
        :value="tab.value"
      >
        <slot :name="tab.value" />
      </TabsContent>
    </div>
  </TabsRoot>
</template>
```

- [ ] **Step 16: Write TsTabs test**

Create `frontend/src/components/ui/__tests__/TsTabs.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsTabs from '../TsTabs.vue'

const tabs = [
  { value: 'one', label: 'Tab One' },
  { value: 'two', label: 'Tab Two' },
]

describe('tsTabs', () => {
  it('renders tab triggers', () => {
    const wrapper = mount(TsTabs, { props: { tabs } })
    const triggers = wrapper.findAll('button')
    expect(triggers.length).toBe(2)
    expect(triggers[0].text()).toBe('Tab One')
    expect(triggers[1].text()).toBe('Tab Two')
  })

  it('emits update:modelValue on tab click', async () => {
    const wrapper = mount(TsTabs, { props: { tabs, modelValue: 'one' } })
    const secondTab = wrapper.findAll('button')[1]
    await secondTab.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['two'])
  })
})
```

- [ ] **Step 17: Commit Group B**

```bash
git add frontend/src/components/ui/TsInput.vue frontend/src/components/ui/TsSelect.vue frontend/src/components/ui/TsTabs.vue frontend/src/components/ui/__tests__/TsInput.spec.ts frontend/src/components/ui/__tests__/TsSelect.spec.ts frontend/src/components/ui/__tests__/TsTabs.spec.ts
git commit -m "$(cat <<'EOF'
feat(ui): add TsInput, TsSelect, TsTabs form components

Input with label/error states, Radix-based Select dropdown, and
Radix-based Tabs with active indicator animation.
EOF
)"
```

### Group C: Overlay Components

- [ ] **Step 18: Create TsDialog**

Create `frontend/src/components/ui/TsDialog.vue`:

```vue
<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'radix-vue'
import { ref, watch } from 'vue'

import { scaleIn } from '../../composables/motion'

const props = defineProps<{
  open: boolean
  title?: string
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()

const contentRef = ref<HTMLElement | null>(null)

watch(() => props.open, (isOpen) => {
  if (isOpen && contentRef.value) {
    scaleIn(contentRef.value, { duration: 0.3 })
  }
})
</script>

<template>
  <DialogRoot :open="open" @update:open="$emit('update:open', $event)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-modal bg-black/60 backdrop-blur-ts-sm" />
      <DialogContent
        ref="contentRef"
        class="fixed left-1/2 top-1/2 z-modal w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-ts-lg border border-ts-border bg-ts-panel p-6 shadow-ts-md"
      >
        <div v-if="title" class="mb-4 flex items-center justify-between">
          <DialogTitle class="text-lg font-semibold text-ts-text">
            {{ title }}
          </DialogTitle>
          <DialogClose
            class="rounded-ts-sm p-1 text-ts-muted transition duration-fast hover:bg-white/10 hover:text-ts-text"
          >
            ✕
          </DialogClose>
        </div>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
```

- [ ] **Step 19: Write TsDialog test**

Create `frontend/src/components/ui/__tests__/TsDialog.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsDialog from '../TsDialog.vue'

describe('tsDialog', () => {
  it('does not render content when closed', () => {
    const wrapper = mount(TsDialog, {
      props: { open: false },
      slots: { default: 'Dialog content' },
    })
    expect(wrapper.text()).not.toContain('Dialog content')
  })

  it('renders content when open', () => {
    const wrapper = mount(TsDialog, {
      props: { open: true },
      slots: { default: 'Dialog content' },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('Dialog content')
    wrapper.unmount()
  })

  it('renders title when provided', () => {
    const wrapper = mount(TsDialog, {
      props: { open: true, title: 'Confirm' },
      slots: { default: 'Body' },
      attachTo: document.body,
    })
    expect(document.body.textContent).toContain('Confirm')
    wrapper.unmount()
  })
})
```

- [ ] **Step 20: Create TsToastProvider and TsToast**

Create `frontend/src/components/ui/TsToastProvider.vue`:

```vue
<script setup lang="ts">
import { ToastProvider, ToastViewport } from 'radix-vue'
</script>

<template>
  <ToastProvider :duration="5000">
    <slot />
    <ToastViewport
      class="fixed bottom-4 right-4 z-toast flex flex-col gap-2"
    />
  </ToastProvider>
</template>
```

Create `frontend/src/components/ui/TsToast.vue`:

```vue
<script setup lang="ts">
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRoot,
  ToastTitle,
} from 'radix-vue'
import { ref, watch } from 'vue'

import { slideUp } from '../../composables/motion'

const props = defineProps<{
  open: boolean
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error'
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()

const rootRef = ref<HTMLElement | null>(null)

const variantClasses: Record<string, string> = {
  default: 'border-ts-border',
  success: 'border-green-500/40',
  error: 'border-red-400/40',
}

watch(() => props.open, (isOpen) => {
  if (isOpen && rootRef.value) {
    slideUp(rootRef.value, { distance: 20, duration: 0.3 })
  }
})
</script>

<template>
  <ToastRoot
    ref="rootRef"
    :open="open"
    class="rounded-ts-md border bg-ts-panel px-4 py-3 shadow-ts-md"
    :class="variantClasses[variant ?? 'default']"
    @update:open="$emit('update:open', $event)"
  >
    <ToastTitle v-if="title" class="text-sm font-semibold text-ts-text">
      {{ title }}
    </ToastTitle>
    <ToastDescription v-if="description" class="mt-1 text-xs text-ts-muted">
      {{ description }}
    </ToastDescription>
    <ToastClose class="absolute right-2 top-2 text-ts-muted hover:text-ts-text">
      ✕
    </ToastClose>
  </ToastRoot>
</template>
```

- [ ] **Step 21: Write TsToast test**

Create `frontend/src/components/ui/__tests__/TsToast.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsToast from '../TsToast.vue'
import TsToastProvider from '../TsToastProvider.vue'

function mountToast(props: Record<string, unknown> = {}) {
  return mount(TsToastProvider, {
    slots: {
      default: {
        components: { TsToast },
        template: '<TsToast v-bind="toastProps" />',
        setup() {
          return { toastProps: { open: true, title: 'Test', description: 'Desc', ...props } }
        },
      },
    },
  })
}

describe('tsToast', () => {
  it('renders title and description when open', () => {
    const wrapper = mountToast()
    expect(wrapper.text()).toContain('Test')
    expect(wrapper.text()).toContain('Desc')
  })
})
```

- [ ] **Step 22: Create TsTooltip**

Create `frontend/src/components/ui/TsTooltip.vue`:

```vue
<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'radix-vue'

defineProps<{
  text: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}>()
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>

      <TooltipPortal>
        <TooltipContent
          :side="side ?? 'top'"
          :side-offset="6"
          class="z-tooltip rounded-ts-sm bg-ts-panel px-3 py-1.5 text-xs text-ts-text shadow-ts-sm"
        >
          {{ text }}
          <TooltipArrow class="fill-ts-panel" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
```

- [ ] **Step 23: Write TsTooltip test**

Create `frontend/src/components/ui/__tests__/TsTooltip.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TsTooltip from '../TsTooltip.vue'

describe('tsTooltip', () => {
  it('renders trigger slot content', () => {
    const wrapper = mount(TsTooltip, {
      props: { text: 'Helpful tip' },
      slots: { default: '<button>Hover me</button>' },
    })
    expect(wrapper.text()).toContain('Hover me')
  })
})
```

- [ ] **Step 24: Commit Group C**

```bash
git add frontend/src/components/ui/TsDialog.vue frontend/src/components/ui/TsToast.vue frontend/src/components/ui/TsToastProvider.vue frontend/src/components/ui/TsTooltip.vue frontend/src/components/ui/__tests__/TsDialog.spec.ts frontend/src/components/ui/__tests__/TsToast.spec.ts frontend/src/components/ui/__tests__/TsTooltip.spec.ts
git commit -m "$(cat <<'EOF'
feat(ui): add TsDialog, TsToast, TsToastProvider, TsTooltip overlays

Radix-based overlay components with motion preset animations (scaleIn
for dialog, slideUp for toast) and design token styling.
EOF
)"
```

### Barrel Export

- [ ] **Step 25: Create barrel export**

Create `frontend/src/components/ui/index.ts`:

```ts
export { default as TsBadge } from './TsBadge.vue'
export { default as TsButton } from './TsButton.vue'
export { default as TsCard } from './TsCard.vue'
export { default as TsDialog } from './TsDialog.vue'
export { default as TsIconButton } from './TsIconButton.vue'
export { default as TsInput } from './TsInput.vue'
export { default as TsSelect } from './TsSelect.vue'
export { default as TsTabs } from './TsTabs.vue'
export { default as TsToast } from './TsToast.vue'
export { default as TsToastProvider } from './TsToastProvider.vue'
export { default as TsTooltip } from './TsTooltip.vue'
```

- [ ] **Step 26: Run all tests, type-check, and lint**

```bash
cd frontend && bun run test
```
Expected: All tests pass (existing + new).

```bash
cd frontend && bun run type-check
```
Expected: No type errors.

```bash
cd frontend && bun run lint:fix
```
Expected: No lint errors.

- [ ] **Step 27: Commit barrel export**

```bash
git add frontend/src/components/ui/index.ts
git commit -m "feat(ui): add barrel export for component library"
```

## Tests

### Frontend

- **TsButton**: Variant classes, size classes, disabled state, click emission, slot rendering
- **TsIconButton**: Aria-label, square sizing, variant defaults
- **TsCard**: Header/footer/default slots, conditional slot rendering
- **TsBadge**: Variant color classes, slot rendering
- **TsInput**: Label, error state, v-model emission, placeholder
- **TsSelect**: Trigger rendering, label, placeholder, disabled
- **TsTabs**: Tab triggers rendering, modelValue emission
- **TsDialog**: Open/closed states, title rendering
- **TsToast**: Title + description rendering within provider
- **TsTooltip**: Trigger slot rendering
