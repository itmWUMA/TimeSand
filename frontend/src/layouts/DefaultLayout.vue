<script setup lang="ts">
import { computed, defineComponent, h, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import TsToast from '../components/ui/TsToast.vue'
import TsToastProvider from '../components/ui/TsToastProvider.vue'
import { useMusicPlayer } from '../composables/useMusicPlayer'
import { useToast } from '../composables/useToast'

type Locale = 'zh-CN' | 'en'
type IconName = 'spark' | 'album' | 'film' | 'upload' | 'music' | 'gear' | 'info'
interface IconNode {
  tag: 'path' | 'circle' | 'rect' | 'line'
  attrs: Record<string, string | number>
}

interface NavItem {
  id: string
  icon: IconName
  labelKey: string
  path: string
}

const iconNodes: Record<IconName, IconNode[]> = {
  spark: [
    { tag: 'path', attrs: { d: 'M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3' } },
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 3 } },
  ],
  album: [
    { tag: 'rect', attrs: { x: 3, y: 3, width: 18, height: 18, rx: 2 } },
    { tag: 'path', attrs: { d: 'M3 14l4-4 5 5 3-3 6 6' } },
  ],
  film: [
    { tag: 'rect', attrs: { x: 3, y: 3, width: 18, height: 18, rx: 2 } },
    { tag: 'path', attrs: { d: 'M3 9h18M3 15h18M9 3v18M15 3v18' } },
  ],
  upload: [
    { tag: 'path', attrs: { d: 'M12 16V4M6 10l6-6 6 6' } },
    { tag: 'path', attrs: { d: 'M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2' } },
  ],
  music: [
    { tag: 'path', attrs: { d: 'M9 18V5l12-2v13' } },
    { tag: 'circle', attrs: { cx: 6, cy: 18, r: 3 } },
    { tag: 'circle', attrs: { cx: 18, cy: 16, r: 3 } },
  ],
  gear: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 3 } },
    { tag: 'path', attrs: { d: 'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z' } },
  ],
  info: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 9 } },
    { tag: 'path', attrs: { d: 'M12 8v.01M11 12h1v5h1' } },
  ],
}

const ShellIcon = defineComponent({
  name: 'ShellIcon',
  props: {
    name: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    return () => h(
      'svg',
      {
        'class': 'shell-icon',
        'viewBox': '0 0 24 24',
        'fill': 'none',
        'stroke': 'currentColor',
        'stroke-width': '1.6',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
      },
      (iconNodes[props.name as IconName] ?? []).map((node, index) =>
        h(node.tag, { key: index, ...node.attrs }),
      ),
    )
  },
})

const route = useRoute()
const { locale, t } = useI18n()
const { toasts, dismissToast } = useToast()
const {
  currentTrack,
  isPlaying,
  tracks,
  currentTime,
  duration,
  playlistName,
  progressPercent,
  volume,
  repeatMode,
  togglePlayPause,
  next,
  prev,
  cycleRepeatMode,
  formatTime,
} = useMusicPlayer()

const navGroups = computed(() => [
  {
    id: 'memory',
    label: t('nav.groups.memory'),
    items: [
      { id: 'draw', icon: 'spark', labelKey: 'nav.cardDraw', path: '/draw' },
      { id: 'albums', icon: 'album', labelKey: 'nav.albums', path: '/albums' },
      { id: 'slideshow', icon: 'film', labelKey: 'nav.slideshow', path: '/slideshow' },
    ] satisfies NavItem[],
  },
  {
    id: 'content',
    label: t('nav.groups.content'),
    items: [
      { id: 'upload', icon: 'upload', labelKey: 'nav.upload', path: '/upload' },
      { id: 'music', icon: 'music', labelKey: 'nav.music', path: '/music' },
    ] satisfies NavItem[],
  },
  {
    id: 'other',
    label: t('nav.groups.other'),
    items: [
      { id: 'settings', icon: 'gear', labelKey: 'nav.settings', path: '/settings' },
      { id: 'landing', icon: 'info', labelKey: 'nav.about', path: '/' },
    ] satisfies NavItem[],
  },
])

const canControl = computed(() => tracks.value.length > 0 && currentTrack.value != null)
const playerTitle = computed(() => canControl.value ? currentTrack.value?.title ?? t('player.noTrack') : t('player.noMusicLoaded'))
const playerSubtitle = computed(() => {
  if (!canControl.value)
    return t('player.unknownArtist')

  const artist = currentTrack.value?.artist || t('player.unknownArtist')
  return playlistName.value ? `${artist} - ${playlistName.value}` : artist
})
const progressStyle = computed(() => ({ width: `${progressPercent.value}%` }))
const volumeStyle = computed(() => ({ width: `${Math.round(volume.value * 100)}%` }))
const repeatLabel = computed(() => {
  if (repeatMode.value === 'one')
    return t('player.repeatOne')

  if (repeatMode.value === 'none')
    return t('player.repeatNone')

  return t('player.repeatAll')
})

const TRAILING_SLASHES_REGEX = /\/+$/

function normalizePath(path: string): string {
  if (path === '/')
    return path

  return path.replace(TRAILING_SLASHES_REGEX, '')
}

function isNavItemActive(item: NavItem): boolean {
  if (item.id === 'draw' && route.name === 'onboarding-debug')
    return true

  const normalizedCurrentPath = normalizePath(route.path)
  const normalizedTargetPath = normalizePath(item.path)

  if (normalizedTargetPath === '/')
    return normalizedCurrentPath === '/'

  return normalizedCurrentPath === normalizedTargetPath
    || normalizedCurrentPath.startsWith(`${normalizedTargetPath}/`)
}

function toggleLocale(nextLocale: Locale): void {
  if (locale.value === nextLocale)
    return

  locale.value = nextLocale
  localStorage.setItem('ts-locale', nextLocale)
  document.documentElement.lang = nextLocale
}

function handleToastOpenChange(toastId: string, isOpen: boolean): void {
  if (!isOpen)
    dismissToast(toastId)
}

onMounted(() => {
  document.documentElement.lang = locale.value
})
</script>

<template>
  <div
    data-testid="default-layout"
    class="ts-app-shell app"
  >
    <aside class="rail" aria-label="Primary navigation">
      <RouterLink class="brand" to="/draw" aria-label="TimeSand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h12M6 21h12" />
            <path d="M7 3c0 4 5 5.5 5 9s-5 5-5 9" />
            <path d="M17 3c0 4-5 5.5-5 9s5 5 5 9" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
        </span>
        <span>
          <span class="brand-text">{{ $t('app.name') }}</span>
          <span class="brand-sub">memory drift</span>
        </span>
      </RouterLink>

      <nav class="rail-nav">
        <template
          v-for="group in navGroups"
          :key="group.id"
        >
          <div
            :data-testid="`rail-group-${group.id}`"
            class="rail-section"
          >
            {{ group.label }}
          </div>
          <RouterLink
            v-for="item in group.items"
            :key="item.id"
            :data-testid="`rail-link-${item.id}`"
            class="rail-link"
            :class="{ 'is-active': isNavItemActive(item) }"
            :to="item.path"
            :aria-current="isNavItemActive(item) ? 'page' : undefined"
          >
            <ShellIcon :name="item.icon" />
            <span>{{ t(item.labelKey) }}</span>
          </RouterLink>
        </template>
      </nav>

      <div class="rail-foot">
        <div class="lang-toggle" role="group" :aria-label="$t('settings.language')">
          <button
            data-testid="locale-zh-CN"
            type="button"
            :class="{ 'is-on': locale === 'zh-CN' }"
            :aria-pressed="locale === 'zh-CN'"
            @click="toggleLocale('zh-CN')"
          >
            CN
          </button>
          <button
            data-testid="locale-en"
            type="button"
            :class="{ 'is-on': locale === 'en' }"
            :aria-pressed="locale === 'en'"
            @click="toggleLocale('en')"
          >
            EN
          </button>
        </div>
      </div>
    </aside>

    <main class="canvas">
      <slot />
    </main>

    <footer
      data-testid="shell-player"
      class="player"
      aria-label="Global music player"
    >
      <div class="player-now">
        <div class="player-cover" aria-hidden="true" />
        <div class="player-meta">
          <div data-testid="shell-player-title" class="player-title">
            {{ playerTitle }}
          </div>
          <div class="player-artist">
            {{ playerSubtitle }}
          </div>
        </div>
      </div>

      <div class="player-ctl">
        <div class="player-ctl-row">
          <button
            type="button"
            class="player-btn"
            :disabled="!canControl"
            :aria-label="$t('player.prev')"
            @click="prev"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 20L9 12l10-8v16zM5 19V5" />
            </svg>
          </button>
          <button
            data-testid="shell-player-play"
            type="button"
            class="player-btn play"
            :disabled="!canControl"
            :aria-label="isPlaying ? $t('player.pause') : $t('player.play')"
            @click="togglePlayPause"
          >
            <svg v-if="isPlaying" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4l14 8L6 20V4z" />
            </svg>
          </button>
          <button
            type="button"
            class="player-btn"
            :disabled="!canControl"
            :aria-label="$t('player.next')"
            @click="next"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4l10 8L5 20V4zM19 5v14" />
            </svg>
          </button>
          <button
            type="button"
            class="player-btn"
            :disabled="!canControl"
            :aria-label="repeatLabel"
            @click="cycleRepeatMode"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>
        <div class="player-progress">
          <span class="num">{{ formatTime(currentTime) }}</span>
          <div class="player-bar" aria-hidden="true">
            <div class="player-bar-fill" :style="progressStyle" />
          </div>
          <span class="num">{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div class="player-tools">
        <div class="player-vol">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19 12c0-2-1-4-3-5" />
          </svg>
          <div class="player-vol-bar" aria-hidden="true">
            <span :style="volumeStyle" />
          </div>
        </div>
      </div>
    </footer>

    <TsToastProvider>
      <TsToast
        v-for="toast in toasts"
        :key="toast.id"
        :open="true"
        :title="toast.title"
        :description="toast.description"
        :variant="toast.variant"
        :duration="toast.durationMs"
        @update:open="(open) => handleToastOpenChange(toast.id, open)"
      />
    </TsToastProvider>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 248px 1fr;
  grid-template-rows: 1fr 84px;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--ts-bg);
  color: var(--ts-fg);
}

.rail {
  position: sticky;
  top: 0;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  padding: 22px 18px 18px;
  border-right: 1px solid var(--ts-border-soft);
  background: var(--ts-bg-deep);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 4px 8px 22px;
  border-bottom: 1px solid var(--ts-border-soft);
}

.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(145deg, var(--ts-accent), var(--ts-accent-deep));
  box-shadow: 0 6px 18px var(--ts-accent-glow);
  color: var(--ts-bg-deep);
}

.brand-mark svg {
  width: 20px;
  height: 20px;
}

.brand-text,
.brand-sub {
  display: block;
}

.brand-text {
  font-family: var(--ts-font-display);
  font-size: 19px;
  font-weight: 600;
}

.brand-sub {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.rail-nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.rail-section {
  padding: 14px 10px 6px;
  color: var(--ts-muted-2);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.rail-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--ts-fg-soft);
  font-size: 14px;
  transition:
    background var(--ts-duration-normal) var(--ts-ease),
    color var(--ts-duration-normal) var(--ts-ease);
}

.rail-link:hover {
  background: var(--ts-surface);
  color: var(--ts-fg);
}

.rail-link.is-active {
  background: var(--ts-surface-2);
  color: var(--ts-fg);
}

.rail-link.is-active::before {
  content: "";
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: var(--ts-accent);
}

.shell-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.rail-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 14px 8px 4px;
  border-top: 1px solid var(--ts-border-soft);
}

.lang-toggle {
  display: inline-flex;
  padding: 3px;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-surface);
  font-family: var(--ts-font-mono);
  font-size: 11px;
}

.lang-toggle button {
  border: 0;
  border-radius: var(--ts-radius-pill);
  background: transparent;
  color: var(--ts-muted);
  letter-spacing: 0.1em;
  padding: 5px 10px;
}

.lang-toggle button.is-on {
  background: var(--ts-surface-2);
  color: var(--ts-fg);
}

.canvas {
  grid-column: 2;
  grid-row: 1;
  overflow-x: hidden;
  padding: 32px var(--ts-gutter) 40px;
}

.player {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 24px;
  align-items: center;
  padding: 0 28px;
  border-top: 1px solid var(--ts-border-soft);
  background: var(--ts-bg-deep);
}

.player-now {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
}

.player-cover {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--ts-surface-2), var(--ts-surface));
  box-shadow: 0 6px 18px rgb(0 0 0 / 40%);
}

.player-cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, var(--ts-accent-soft), transparent 60%);
}

.player-meta {
  min-width: 0;
}

.player-title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-artist {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0;
}

.player-ctl {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.player-ctl-row {
  display: flex;
  align-items: center;
  gap: 18px;
}

.player-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ts-fg-soft);
  transition:
    background var(--ts-duration-fast) var(--ts-ease),
    color var(--ts-duration-fast) var(--ts-ease);
}

.player-btn:hover:not(:disabled) {
  background: var(--ts-surface);
  color: var(--ts-fg);
}

.player-btn:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.player-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
}

.player-btn.play {
  width: 38px;
  height: 38px;
  background: var(--ts-accent);
  color: var(--ts-bg-deep);
}

.player-btn.play svg {
  fill: currentColor;
  stroke: none;
}

.player-progress {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  letter-spacing: 0;
}

.player-bar {
  position: relative;
  flex: 1;
  height: 3px;
  overflow: hidden;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-border);
}

.player-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: var(--ts-radius-pill);
  background: linear-gradient(90deg, var(--ts-accent-deep), var(--ts-accent));
}

.player-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.player-vol {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ts-muted);
}

.player-vol svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.player-vol-bar {
  position: relative;
  width: 80px;
  height: 3px;
  overflow: hidden;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-border);
}

.player-vol-bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: var(--ts-radius-pill);
  background: var(--ts-fg-soft);
}

@media (max-width: 1100px) {
  .app {
    grid-template-columns: 72px 1fr;
  }

  .rail {
    padding: 18px 10px;
  }

  .brand-text,
  .brand-sub,
  .rail-section,
  .lang-toggle,
  .rail-link span {
    display: none;
  }

  .brand {
    justify-content: center;
    padding-inline: 0;
  }

  .rail-link {
    justify-content: center;
    padding: 12px 8px;
  }

  .rail-foot {
    justify-content: center;
    padding: 14px 4px 4px;
  }
}

@media (max-width: 860px) {
  .player {
    grid-template-columns: 200px 1fr;
    gap: 14px;
    padding: 0 18px;
  }

  .player-tools {
    display: none;
  }

  .player-progress {
    font-size: 10px;
  }
}

@media (max-width: 720px) {
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .canvas {
    padding: 16px 16px calc(64px + 60px + env(safe-area-inset-bottom, 0px) + 16px);
  }

  .player {
    position: fixed;
    right: 0;
    bottom: calc(60px + env(safe-area-inset-bottom, 0px));
    left: 0;
    z-index: var(--ts-z-player);
    height: 64px;
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding: 0 14px;
  }

  .player-progress,
  .player-tools {
    display: none;
  }

  .player-cover {
    width: 44px;
    height: 44px;
  }

  .player-title {
    font-size: 12.5px;
  }

  .player-artist {
    font-size: 10px;
  }

  .player-ctl-row {
    gap: 12px;
  }

  .player-btn {
    width: 36px;
    height: 36px;
  }

  .player-btn.play {
    width: 40px;
    height: 40px;
  }

  .player-btn:nth-child(4) {
    display: none;
  }

  .rail {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: calc(var(--ts-z-player) + 1);
    width: auto;
    height: auto;
    flex-direction: row;
    padding: 4px 4px calc(env(safe-area-inset-bottom, 0px) + 4px);
    border-top: 1px solid var(--ts-border-soft);
    border-right: 0;
    background: var(--ts-bg-deep);
  }

  .brand,
  .rail-section,
  .rail-foot {
    display: none;
  }

  .rail-nav {
    flex: 1;
    flex-direction: row;
    justify-content: space-around;
    gap: 0;
  }

  .rail-link {
    flex: 1;
    flex-direction: column;
    justify-content: center;
    min-height: 52px;
    gap: 3px;
    padding: 10px 6px;
  }

  .rail-link .shell-icon {
    width: 20px;
    height: 20px;
  }

  .rail-link.is-active {
    background: transparent;
    color: var(--ts-accent);
  }

  .rail-link.is-active::before {
    display: none;
  }
}

@media (max-width: 420px) {
  .canvas {
    padding-right: 12px;
    padding-left: 12px;
  }

  .player {
    padding: 0 10px;
  }

  .player-cover {
    width: 40px;
    height: 40px;
  }

  .player-now {
    gap: 10px;
  }

  .player-title {
    font-size: 12px;
  }

  .rail-link {
    padding: 8px 4px;
  }

  .rail-link .shell-icon {
    width: 18px;
    height: 18px;
  }

  .rail-link span {
    display: block;
    color: inherit;
    font-family: var(--ts-font-mono);
    font-size: 9px;
    letter-spacing: 0;
    text-transform: uppercase;
  }
}
</style>
