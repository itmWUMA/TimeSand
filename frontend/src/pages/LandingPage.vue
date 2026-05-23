<script setup lang="ts">
const stats = [
  { key: 'localFirst', value: '100%' },
  { key: 'noCloud', value: '0' },
  { key: 'dockerReady', value: 'Docker' },
] as const

const features = [
  { key: 'featureDraw', descKey: 'featureDrawDesc', number: '01' },
  { key: 'featureCollect', descKey: 'featureCollectDesc', number: '02' },
  { key: 'featureListen', descKey: 'featureListenDesc', number: '03' },
] as const
</script>

<template>
  <div class="landing-page">
    <header class="landing-nav">
      <RouterLink class="landing-brand" to="/" aria-label="TimeSand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3h12M6 21h12" />
            <path d="M7 3c0 4 5 5.5 5 9s-5 5-5 9" />
            <path d="M17 3c0 4-5 5.5-5 9s5 5 5 9" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
        </span>
        <span>{{ $t('app.name') }}</span>
      </RouterLink>

      <div class="landing-actions">
        <RouterLink class="btn btn-ghost" to="/albums">
          {{ $t('landing.viewLibrary') }}
        </RouterLink>
        <RouterLink class="btn btn-primary" to="/draw">
          {{ $t('landing.openApp') }}
        </RouterLink>
      </div>
    </header>

    <main>
      <section class="landing-hero">
        <div class="landing-copy">
          <p class="h-eyebrow">
            {{ $t('landing.eyebrow') }}
          </p>
          <h1>{{ $t('landing.title') }}</h1>
          <p class="landing-lead">
            {{ $t('landing.lead') }}
          </p>
          <div class="hero-actions">
            <RouterLink class="btn btn-primary" to="/draw">
              {{ $t('landing.openApp') }}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </RouterLink>
            <RouterLink class="btn" to="/albums">
              {{ $t('landing.viewLibrary') }}
            </RouterLink>
          </div>
          <dl class="hero-stats">
            <div v-for="stat in stats" :key="stat.key">
              <dt>{{ stat.value }}</dt>
              <dd>{{ $t(`landing.${stat.key}`) }}</dd>
            </div>
          </dl>
        </div>

        <div class="hero-stage" aria-hidden="true">
          <div class="float-card f1">
            <span>2019 / 05 / 23</span>
          </div>
          <div class="float-card f2">
            <span>2021 / 03 / 11</span>
          </div>
          <div class="float-card f3">
            <span>2024 / 12 / 06</span>
          </div>
        </div>
      </section>

      <section class="feature-band" aria-label="TimeSand features">
        <article
          v-for="feature in features"
          :key="feature.key"
          class="feature-card"
        >
          <span class="feature-number">{{ feature.number }}</span>
          <h2>{{ $t(`landing.${feature.key}`) }}</h2>
          <p>{{ $t(`landing.${feature.descKey}`) }}</p>
          <div class="feature-art" :class="`art-${feature.number}`" />
        </article>
      </section>

      <section class="landing-cta">
        <p class="h-eyebrow">
          Start
        </p>
        <h2>{{ $t('landing.ctaTitle') }}</h2>
        <p>{{ $t('landing.ctaBody') }}</p>
        <RouterLink class="btn btn-primary" to="/draw">
          {{ $t('landing.openApp') }}
        </RouterLink>
      </section>
    </main>
  </div>
</template>

<style scoped>
.landing-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}

.landing-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px 32px;
  border-bottom: 1px solid var(--ts-border-soft);
  background: oklch(15% 0.014 45 / 70%);
  backdrop-filter: blur(14px);
}

.landing-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--ts-font-display);
  font-size: 18px;
  font-weight: 600;
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(145deg, var(--ts-accent), var(--ts-accent-deep));
  color: var(--ts-bg-deep);
  box-shadow: 0 6px 18px var(--ts-accent-glow);
}

.brand-mark svg {
  width: 18px;
  height: 18px;
}

.landing-actions,
.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.6;
}

.landing-hero {
  display: grid;
  max-width: 1280px;
  margin: 0 auto;
  grid-template-columns: 1.08fr 1fr;
  gap: 64px;
  align-items: center;
  padding: 80px 32px 96px;
}

.landing-copy h1 {
  margin: 0 0 24px;
  font-family: var(--ts-font-display);
  font-size: clamp(56px, 8vw, 112px);
  font-weight: 500;
  line-height: 0.95;
  letter-spacing: 0;
}

.landing-lead {
  max-width: 54ch;
  margin: 0 0 36px;
  color: var(--ts-fg-soft);
  font-size: 17px;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  gap: 36px;
  margin: 40px 0 0;
  padding-top: 30px;
  border-top: 1px solid var(--ts-border-soft);
}

.hero-stats dt {
  color: var(--ts-fg);
  font-family: var(--ts-font-display);
  font-size: 28px;
  font-weight: 500;
  line-height: 1;
}

.hero-stats dd {
  margin: 8px 0 0;
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero-stage {
  position: relative;
  aspect-ratio: 5 / 6;
  max-height: 640px;
}

.hero-stage::before {
  content: "";
  position: absolute;
  inset: 8% 0 0;
  border: 1px solid var(--ts-border-soft);
  border-radius: 50%;
}

.float-card {
  position: absolute;
  width: 56%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border-radius: var(--ts-radius);
  box-shadow: var(--ts-shadow-card);
}

.float-card::before {
  content: "";
  position: absolute;
  inset: 0;
}

.float-card span {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  color: var(--ts-accent);
  font-family: var(--ts-font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.f1 {
  top: 4%;
  left: 8%;
  transform: rotate(-7deg);
  background: linear-gradient(135deg, #c89766, #381f10);
}

.f1::before {
  background:
    radial-gradient(circle at 50% 32%, #f4d49a 0 18%, transparent 19%),
    linear-gradient(168deg, transparent 0 66%, #231410 67%);
  opacity: 0.76;
}

.f2 {
  top: 18%;
  right: 6%;
  transform: rotate(8deg);
  background: linear-gradient(135deg, #78564a, #1a1410);
}

.f2::before {
  inset: 22% 26%;
  border: 18px solid rgb(244 212 154 / 22%);
  background: rgb(221 192 154 / 28%);
}

.f3 {
  bottom: 6%;
  left: 22%;
  width: 60%;
  transform: rotate(-3deg);
  background: linear-gradient(135deg, #a87b50, #2a1810);
}

.f3::before {
  background:
    radial-gradient(circle at 72% 25%, #f4d49a 0 11%, transparent 12%),
    linear-gradient(168deg, transparent 0 64%, rgb(26 14 8 / 76%) 65%);
}

.feature-band {
  display: grid;
  max-width: 1280px;
  margin: 0 auto;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  padding: 0 32px 88px;
}

.feature-card {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  padding: 28px 26px 30px;
  border: 1px solid var(--ts-border-soft);
  border-radius: var(--ts-radius-lg);
  background: var(--ts-surface);
}

.feature-number {
  color: var(--ts-muted);
  font-family: var(--ts-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.feature-card h2 {
  margin: 14px 0 10px;
  font-family: var(--ts-font-display);
  font-size: 26px;
  font-weight: 500;
}

.feature-card p {
  margin: 0 0 22px;
  color: var(--ts-fg-soft);
  font-size: 14px;
  line-height: 1.55;
}

.feature-art {
  height: 110px;
  margin-top: auto;
  border-radius: 12px;
}

.art-01 {
  background:
    radial-gradient(circle at 50% 28%, var(--ts-accent), transparent 8%),
    radial-gradient(circle at 30% 60%, var(--ts-accent-soft), transparent 50%),
    linear-gradient(135deg, oklch(28% 0.03 50), oklch(18% 0.02 45));
}

.art-02 {
  background:
    linear-gradient(90deg, transparent 0 22%, rgb(244 212 154 / 22%) 22% 24%, transparent 24% 48%, rgb(244 212 154 / 22%) 48% 50%, transparent 50% 74%, rgb(244 212 154 / 22%) 74% 76%, transparent 76%),
    linear-gradient(135deg, oklch(30% 0.04 60), oklch(18% 0.02 45));
}

.art-03 {
  background:
    repeating-linear-gradient(90deg, var(--ts-accent) 0 2px, transparent 2px 8px),
    linear-gradient(135deg, oklch(28% 0.03 50), oklch(18% 0.02 45));
  background-size: auto 30px, auto;
  background-position: center;
  background-repeat: repeat-x, no-repeat;
}

.landing-cta {
  max-width: 900px;
  margin: 0 auto;
  padding: 88px 32px 110px;
  border-top: 1px solid var(--ts-border-soft);
  text-align: center;
}

.landing-cta h2 {
  margin: 8px 0 18px;
  font-family: var(--ts-font-display);
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 500;
  line-height: 1.05;
}

.landing-cta p {
  max-width: 54ch;
  margin: 0 auto 34px;
  color: var(--ts-muted);
}

@media (max-width: 960px) {
  .landing-hero,
  .feature-band {
    grid-template-columns: 1fr;
  }

  .hero-stage {
    width: min(480px, 100%);
    margin: 0 auto;
  }
}

@media (max-width: 720px) {
  .landing-nav {
    padding: 14px 18px;
  }

  .landing-actions .btn-ghost {
    display: none;
  }

  .landing-hero {
    gap: 40px;
    padding: 48px 20px 60px;
  }

  .landing-copy h1 {
    font-size: clamp(44px, 15vw, 70px);
  }

  .landing-lead {
    font-size: 15px;
  }

  .hero-stats {
    flex-wrap: wrap;
    gap: 22px;
  }

  .feature-band {
    padding: 0 20px 64px;
  }

  .feature-card {
    min-height: auto;
  }
}

@media (max-width: 420px) {
  .hero-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions .btn {
    justify-content: center;
  }
}
</style>
