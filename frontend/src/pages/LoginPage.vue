<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import { useToast } from '../composables/useToast'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { showToast } = useToast()

const username = ref('')
const password = ref('')
const rememberMe = ref(true)
const passwordVisible = ref(false)
const hasSubmitted = ref(false)
const submitState = ref<'idle' | 'loading' | 'success' | 'failure'>('idle')
const localUninitialized = ref(false)

const usernameHasError = computed(() => hasSubmitted.value && !username.value.trim())
const passwordHasError = computed(() => hasSubmitted.value && !password.value)
const isUninitialized = computed(() => localUninitialized.value || auth.isUninitialized)

function clearFailure(): void {
  if (submitState.value === 'failure')
    submitState.value = 'idle'
}

async function handleSubmit(): Promise<void> {
  hasSubmitted.value = true
  localUninitialized.value = false

  if (usernameHasError.value || passwordHasError.value) {
    submitState.value = 'failure'
    showToast(t('auth.error.missingFields'), undefined, 'error')
    return
  }

  submitState.value = 'loading'
  try {
    await auth.login({
      username: username.value.trim(),
      password: password.value,
      remember_me: rememberMe.value,
    })
    submitState.value = 'success'
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/draw'
    await router.push(redirect)
  }
  catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 503) {
      localUninitialized.value = true
      auth.isUninitialized = true
      return
    }
    submitState.value = 'failure'
    showToast(t('auth.error.invalidCredentials'), undefined, 'error')
  }
}
</script>

<template>
  <main
    data-testid="login-page"
    class="login-page"
  >
    <div class="login-bg" aria-hidden="true">
      <i
        v-for="index in 22"
        :key="index"
        class="grain"
        :style="{
          left: `${(index * 37) % 100}%`,
          top: `${(index * 53) % 100}%`,
          opacity: `${0.25 + ((index * 7) % 45) / 100}`,
        }"
      />
    </div>

    <header class="login-topbar">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 3h14M5 21h14M6.5 3c0 5 3 6 5.5 9 2.5-3 5.5-4 5.5-9M6.5 21c0-5 3-6 5.5-9 2.5 3 5.5 4 5.5 9" />
        </svg>
      </div>
      <div class="brand-copy">
        <span class="brand-name">TimeSand</span>
        <span class="brand-sub">MEMORY DRIFT</span>
      </div>
    </header>

    <section
      v-if="isUninitialized"
      class="login-card notice-card"
      aria-live="polite"
    >
      <div class="notice-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 17h.01" />
        </svg>
      </div>
      <h1 class="login-title">
        {{ t('auth.error.systemNotInitialized') }}
      </h1>
      <p class="notice-copy">
        {{ t('auth.error.systemNotInitializedDescription') }}
      </p>
    </section>

    <section
      v-else
      class="login-card"
      aria-labelledby="login-title"
    >
      <h1 id="login-title" class="login-title">
        {{ t('auth.login.titleLead') }}
        <em>{{ t('auth.login.titleEmphasis') }}</em>
      </h1>

      <form class="login-form" novalidate @submit.prevent="handleSubmit">
        <label class="field" :class="{ 'has-error': usernameHasError }">
          <span class="sr-only">{{ t('auth.login.username') }}</span>
          <span class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.login.username')"
              spellcheck="false"
              @input="clearFailure"
            >
          </span>
          <span class="help">{{ t('auth.login.usernameRequired') }}</span>
        </label>

        <label class="field" :class="{ 'has-error': passwordHasError }">
          <span class="sr-only">{{ t('auth.login.password') }}</span>
          <span class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 1 1 8 0v3" />
            </svg>
            <input
              v-model="password"
              :type="passwordVisible ? 'text' : 'password'"
              autocomplete="current-password"
              :placeholder="t('auth.login.password')"
              @input="clearFailure"
            >
            <button
              type="button"
              class="password-toggle"
              :aria-label="passwordVisible ? t('auth.login.hidePassword') : t('auth.login.showPassword')"
              @click="passwordVisible = !passwordVisible"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </span>
          <span class="help">{{ t('auth.login.passwordRequired') }}</span>
        </label>

        <div class="login-row">
          <label class="remember">
            <input v-model="rememberMe" type="checkbox">
            <span class="check-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4 4 10-10" />
              </svg>
            </span>
            <span>{{ t('auth.login.rememberMe') }}</span>
          </label>
        </div>

        <button
          type="submit"
          class="submit"
          :data-state="submitState"
          :disabled="submitState === 'loading'"
        >
          <span class="label">{{ t('auth.login.submit') }}</span>
          <span class="state-label" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                v-if="submitState === 'success'"
                d="M5 12.5l4 4 10-10"
              />
              <path
                v-else-if="submitState === 'failure'"
                d="M6 6l12 12M18 6 6 18"
              />
              <path
                v-else
                d="M5 3h14M5 21h14M6.5 3c0 5 3 6 5.5 9 2.5-3 5.5-4 5.5-9M6.5 21c0-5 3-6 5.5-9 2.5 3 5.5 4 5.5 9"
              />
            </svg>
            {{ submitState === 'failure' ? t('auth.login.failed') : t('auth.login.loading') }}
          </span>
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  --login-bg-0: oklch(13.5% 0.012 55);
  --login-bg-1: oklch(16% 0.014 58);
  --login-surface: oklch(19.5% 0.016 60);
  --login-surface-hi: oklch(23% 0.018 62);
  --login-border: oklch(28% 0.02 60);
  --login-border-hi: oklch(36% 0.025 62);
  --login-fg: oklch(93% 0.018 75);
  --login-fg-soft: oklch(78% 0.025 70);
  --login-muted: oklch(58% 0.028 65);
  --login-muted-2: oklch(44% 0.022 62);
  --login-amber-1: oklch(78% 0.13 75);
  --login-amber-2: oklch(70% 0.14 65);
  --login-amber-3: oklch(58% 0.13 55);
  --login-amber-glow: oklch(72% 0.15 70 / 35%);
  --login-warn: oklch(68% 0.16 35);

  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--login-bg-0);
  color: var(--login-fg);
  font: 15px/1.55 var(--ts-font-body);
}

.login-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.login-bg::before {
  content: "";
  position: absolute;
  top: 38%;
  left: 50%;
  width: min(1100px, 140vw);
  height: min(1100px, 140vw);
  background: radial-gradient(circle, oklch(38% 0.06 60 / 55%) 0%, transparent 55%);
  filter: blur(20px);
  transform: translate(-50%, -50%);
  animation: glow-breathe 10s ease-in-out infinite alternate;
}

.login-bg::after {
  content: "";
  position: absolute;
  top: 38%;
  left: 50%;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, oklch(60% 0.12 65 / 18%) 0%, transparent 60%);
  transform: translate(-50%, -50%);
  animation: glow-shift 14s ease-in-out infinite alternate;
}

.grain {
  position: absolute;
  z-index: 1;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: oklch(85% 0.06 75 / 55%);
  box-shadow: 0 0 6px 1px oklch(75% 0.1 70 / 35%);
  animation: grain-drift 12s ease-in-out infinite alternate;
}

.grain:nth-child(3n) {
  animation-duration: 16s;
  animation-delay: -4s;
}

.grain:nth-child(3n+1) {
  animation-duration: 20s;
  animation-delay: -8s;
}

.grain:nth-child(5n) {
  animation-duration: 10s;
  animation-delay: -2s;
}

.login-topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 28px;
}

.brand-mark {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(140deg, var(--login-amber-1), var(--login-amber-3));
  box-shadow:
    0 0 24px var(--login-amber-glow),
    inset 0 1px 0 oklch(100% 0 0 / 35%);
}

.brand-mark svg {
  width: 14px;
  height: 14px;
  stroke: oklch(18% 0.03 60);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1;
}

.brand-name {
  color: var(--login-fg);
  font-size: 14px;
}

.brand-sub {
  color: var(--login-muted-2);
  font-family: var(--ts-font-mono);
  font-size: 9px;
  letter-spacing: 0.28em;
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(380px, calc(100vw - 48px));
  margin: 64px auto 80px;
  padding: 40px 36px 32px;
  border: 1px solid var(--login-border);
  border-radius: 18px;
  background: linear-gradient(180deg, var(--login-surface) 0%, var(--login-bg-1) 100%);
  box-shadow:
    inset 0 1px 0 oklch(100% 0 0 / 4%),
    0 30px 80px -20px rgb(0 0 0 / 60%),
    0 0 0 1px oklch(100% 0 0 / 1.5%);
}

.login-title {
  color: var(--login-fg);
  font-family: var(--ts-font-display);
  font-size: 30px;
  font-weight: 500;
  line-height: 1.1;
  text-align: center;
}

.login-title em {
  color: var(--login-amber-2);
  font-style: italic;
  font-weight: 400;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 30px;
}

.field {
  display: block;
}

.input-wrap {
  position: relative;
  display: block;
  border: 1px solid var(--login-border);
  border-radius: 10px;
  background: var(--login-surface-hi);
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}

.input-wrap:hover {
  border-color: var(--login-border-hi);
}

.input-wrap:focus-within {
  border-color: var(--login-amber-2);
  background: oklch(22% 0.018 62);
  box-shadow: 0 0 0 3px oklch(70% 0.14 65 / 14%);
}

.field.has-error .input-wrap {
  border-color: var(--login-warn);
  box-shadow: 0 0 0 3px oklch(68% 0.16 35 / 14%);
}

.input-wrap input {
  width: 100%;
  padding: 13px 42px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--login-fg);
  font: 14px/1 var(--ts-font-body);
}

.input-wrap input::placeholder {
  color: var(--login-muted-2);
}

.input-icon {
  position: absolute;
  top: 50%;
  left: 14px;
  width: 16px;
  height: 16px;
  color: var(--login-muted);
  pointer-events: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
  transform: translateY(-50%);
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 6px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--login-muted);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  transform: translateY(-50%);
}

.password-toggle:hover {
  background: oklch(28% 0.02 60);
  color: var(--login-fg-soft);
}

.password-toggle svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  stroke-width: 1.5;
}

.help {
  display: none;
  margin-top: 7px;
  color: var(--login-warn);
  font-size: 11.5px;
}

.field.has-error .help {
  display: block;
}

.login-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}

.remember {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--login-fg-soft);
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}

.remember input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.check-box {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 1px solid var(--login-border-hi);
  border-radius: 5px;
  background: var(--login-surface-hi);
  transition: all 0.15s;
}

.check-box svg {
  width: 11px;
  height: 11px;
  color: oklch(20% 0.02 60);
  opacity: 0;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
  transform: scale(0.6);
  transition: opacity 0.15s, transform 0.15s;
}

.remember input:checked + .check-box {
  border-color: var(--login-amber-3);
  background: linear-gradient(140deg, var(--login-amber-1), var(--login-amber-3));
  box-shadow: 0 0 12px var(--login-amber-glow);
}

.remember input:checked + .check-box svg {
  opacity: 1;
  transform: scale(1);
}

.submit {
  position: relative;
  display: flex;
  width: 100%;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--login-amber-1) 0%, var(--login-amber-2) 55%, var(--login-amber-3) 100%);
  box-shadow:
    inset 0 1px 0 oklch(100% 0 0 / 35%),
    inset 0 -1px 0 oklch(0% 0 0 / 25%),
    0 8px 22px -6px var(--login-amber-glow),
    0 0 0 1px oklch(60% 0.13 60 / 35%);
  color: oklch(18% 0.03 60);
  cursor: pointer;
  font: 13.5px/1 var(--ts-font-body);
  letter-spacing: 0.02em;
  transition: transform 0.12s ease, box-shadow 0.2s, filter 0.2s, background 0.2s;
}

.submit:hover {
  filter: brightness(1.05);
}

.submit:active {
  transform: translateY(1px);
}

.submit:disabled {
  cursor: default;
  filter: none;
}

.state-label {
  display: none;
  align-items: center;
  gap: 10px;
}

.state-label svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.submit[data-state="loading"],
.submit[data-state="success"],
.submit[data-state="failure"] {
  color: var(--login-fg-soft);
}

.submit[data-state="loading"] {
  border: 1px solid var(--login-border);
  background: linear-gradient(180deg, oklch(36% 0.03 60), oklch(24% 0.02 60));
  box-shadow: inset 0 1px 0 oklch(100% 0 0 / 6%);
}

.submit[data-state="success"] {
  background: linear-gradient(180deg, oklch(78% 0.14 80), oklch(62% 0.14 70));
  color: oklch(18% 0.03 60);
}

.submit[data-state="failure"] {
  background: linear-gradient(180deg, oklch(48% 0.14 35), oklch(34% 0.1 30));
  box-shadow:
    0 0 0 1px oklch(50% 0.16 35 / 50%),
    0 8px 22px -6px oklch(50% 0.16 35 / 35%);
  color: oklch(96% 0.03 70);
  animation: shake 0.4s ease;
}

.submit[data-state="loading"] .label,
.submit[data-state="success"] .label,
.submit[data-state="failure"] .label {
  display: none;
}

.submit[data-state="loading"] .state-label,
.submit[data-state="success"] .state-label,
.submit[data-state="failure"] .state-label {
  display: inline-flex;
}

.submit[data-state="loading"] .state-label svg {
  animation: flip 1.8s ease-in-out infinite;
}

.notice-card {
  text-align: center;
}

.notice-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: oklch(24% 0.05 35);
  color: var(--login-amber-2);
}

.notice-icon svg {
  width: 22px;
  height: 22px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.6;
}

.notice-copy {
  margin-top: 18px;
  color: var(--login-fg-soft);
  font-size: 13px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes flip {
  0%,
  45% {
    transform: rotate(0);
  }

  50%,
  100% {
    transform: rotate(180deg);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-6px);
  }

  40% {
    transform: translateX(5px);
  }

  60% {
    transform: translateX(-3px);
  }

  80% {
    transform: translateX(2px);
  }
}

@keyframes grain-drift {
  0% {
    transform: translate(0, 0);
    opacity: 0.4;
  }

  25% {
    transform: translate(8px, -12px);
    opacity: 0.9;
  }

  50% {
    transform: translate(-6px, -4px);
    opacity: 0.6;
  }

  75% {
    transform: translate(4px, 10px);
    opacity: 0.8;
  }

  100% {
    transform: translate(-2px, 6px);
    opacity: 0.5;
  }
}

@keyframes glow-breathe {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.9;
  }

  100% {
    transform: translate(-50%, -50%) scale(1.08);
    opacity: 1;
  }
}

@keyframes glow-shift {
  0% {
    transform: translate(-50%, -50%) scale(1) translate(0, 0);
  }

  50% {
    transform: translate(-50%, -50%) scale(1.06) translate(12px, -8px);
  }

  100% {
    transform: translate(-50%, -50%) scale(1.03) translate(-8px, 6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .submit,
  .state-label svg,
  .submit[data-state="failure"],
  .grain,
  .login-bg::before,
  .login-bg::after {
    animation: none;
    transition: none;
  }
}

@media (max-width: 640px) {
  .login-card {
    width: min(380px, calc(100vw - 32px));
    margin-top: 36px;
    padding: 30px 24px 28px;
  }

  .login-title {
    font-size: 32px;
  }
}
</style>
