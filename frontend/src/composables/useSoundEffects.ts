import type { Ref } from 'vue'
import { Howl, Howler } from 'howler'
import { ref } from 'vue'

type CeremonySoundId = 'shuffle' | 'whoosh' | 'flip' | 'reveal' | 'memory' | 'slideSwish'
type UiSoundId = 'click' | 'success'

export type SoundId = CeremonySoundId | UiSoundId

export interface SoundEffects {
  play: (id: SoundId) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unmute: () => void
  isMuted: Ref<boolean>
}

const VOLUME_KEY = 'ts-sfx-volume'
const MUTED_KEY = 'ts-sfx-muted'
const DEFAULT_VOLUME = 0.6

const CEREMONY_SOUND_IDS: CeremonySoundId[] = ['shuffle', 'whoosh', 'flip', 'reveal', 'memory', 'slideSwish']

const CEREMONY_SPRITE: Record<CeremonySoundId, [number, number]> = {
  shuffle: [0, 320],
  whoosh: [380, 350],
  flip: [790, 320],
  reveal: [1170, 880],
  memory: [2110, 980],
  slideSwish: [3150, 430],
}

const UI_SPRITE: Record<UiSoundId, [number, number]> = {
  click: [0, 100],
  success: [160, 420],
}

let instance: SoundEffects | null = null
let ceremonyHowl: Howl | null = null
let uiHowl: Howl | null = null
let unlockHandler: (() => void) | null = null
let unlockListenersAttached = false
let audioUnlocked = false

function canUseBrowserApis(): boolean {
  return typeof window !== 'undefined'
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME
  }

  return Math.max(0, Math.min(1, value))
}

function readStoredVolume(): number {
  if (!canUseBrowserApis()) {
    return DEFAULT_VOLUME
  }

  const raw = localStorage.getItem(VOLUME_KEY)
  if (raw == null) {
    return DEFAULT_VOLUME
  }

  return clampVolume(Number.parseFloat(raw))
}

function readStoredMutedState(): { isMuted: boolean, explicitlyUnmuted: boolean } {
  if (!canUseBrowserApis()) {
    return { isMuted: false, explicitlyUnmuted: false }
  }

  const raw = localStorage.getItem(MUTED_KEY)
  if (raw === 'true') {
    return { isMuted: true, explicitlyUnmuted: false }
  }

  if (raw === 'false') {
    return { isMuted: false, explicitlyUnmuted: true }
  }

  return { isMuted: false, explicitlyUnmuted: false }
}

function persistVolume(volume: number): void {
  if (!canUseBrowserApis()) {
    return
  }
  localStorage.setItem(VOLUME_KEY, String(volume))
}

function persistMuted(muted: boolean): void {
  if (!canUseBrowserApis()) {
    return
  }
  localStorage.setItem(MUTED_KEY, muted ? 'true' : 'false')
}

function isCeremonySound(id: SoundId): id is CeremonySoundId {
  return CEREMONY_SOUND_IDS.includes(id as CeremonySoundId)
}

function prefersReducedMotion(): boolean {
  if (!canUseBrowserApis() || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function syncHowlMuteState(muted: boolean): void {
  ceremonyHowl?.mute(muted)
  uiHowl?.mute(muted)
}

function syncHowlVolumeState(volume: number): void {
  ceremonyHowl?.volume(volume)
  uiHowl?.volume(volume)
}

function ensureCeremonyHowl(volume: number, muted: boolean): Howl {
  if (!ceremonyHowl) {
    ceremonyHowl = new Howl({
      src: [
        new URL('../assets/sounds/ceremony.webm', import.meta.url).href,
        new URL('../assets/sounds/ceremony.mp3', import.meta.url).href,
      ],
      sprite: CEREMONY_SPRITE,
      volume,
      mute: muted,
    })
  }

  return ceremonyHowl
}

function ensureUiHowl(volume: number, muted: boolean): Howl {
  if (!uiHowl) {
    uiHowl = new Howl({
      src: [
        new URL('../assets/sounds/ui.webm', import.meta.url).href,
        new URL('../assets/sounds/ui.mp3', import.meta.url).href,
      ],
      sprite: UI_SPRITE,
      volume,
      mute: muted,
    })
  }

  return uiHowl
}

function detachUnlockListeners(): void {
  if (!unlockListenersAttached || !unlockHandler || typeof document === 'undefined') {
    unlockListenersAttached = false
    unlockHandler = null
    return
  }

  document.removeEventListener('click', unlockHandler, true)
  document.removeEventListener('touchstart', unlockHandler, true)
  unlockListenersAttached = false
  unlockHandler = null
}

function resumeAudioContext(): void {
  const context = Howler.ctx
  if (!context || typeof context.resume !== 'function') {
    return
  }

  if (context.state === 'suspended') {
    void context.resume()
  }
}

function ensureAudioUnlockListeners(): void {
  if (unlockListenersAttached || typeof document === 'undefined') {
    return
  }

  unlockHandler = () => {
    if (audioUnlocked) {
      detachUnlockListeners()
      return
    }

    audioUnlocked = true
    resumeAudioContext()
    detachUnlockListeners()
  }

  document.addEventListener('click', unlockHandler, { capture: true, once: true })
  document.addEventListener('touchstart', unlockHandler, { capture: true, once: true })
  unlockListenersAttached = true
}

export function useSoundEffects(): SoundEffects {
  if (instance) {
    return instance
  }

  const volume = ref(readStoredVolume())
  const storedMutedState = readStoredMutedState()
  const isMuted = ref(storedMutedState.isMuted)
  const explicitlyUnmuted = ref(storedMutedState.explicitlyUnmuted)

  ensureAudioUnlockListeners()

  function play(id: SoundId): void {
    if (isMuted.value) {
      return
    }

    if (prefersReducedMotion() && !explicitlyUnmuted.value) {
      return
    }

    const howl = isCeremonySound(id)
      ? ensureCeremonyHowl(volume.value, isMuted.value)
      : ensureUiHowl(volume.value, isMuted.value)

    howl.play(id)
  }

  function setVolume(nextVolume: number): void {
    const clamped = clampVolume(nextVolume)
    volume.value = clamped
    persistVolume(clamped)
    syncHowlVolumeState(clamped)
  }

  function getVolume(): number {
    return volume.value
  }

  function mute(): void {
    isMuted.value = true
    explicitlyUnmuted.value = false
    persistMuted(true)
    syncHowlMuteState(true)
  }

  function unmute(): void {
    isMuted.value = false
    explicitlyUnmuted.value = true
    persistMuted(false)
    syncHowlMuteState(false)
  }

  instance = {
    play,
    setVolume,
    getVolume,
    mute,
    unmute,
    isMuted,
  }

  return instance
}

export function __resetSoundEffectsForTests(): void {
  detachUnlockListeners()
  instance = null
  ceremonyHowl = null
  uiHowl = null
  audioUnlocked = false
}
