import type { Ref } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseWeightReason } from '../utils/parseWeightReason'

export function useMemoryText(weightReason: Ref<string | null>): Ref<string | null> {
  const { t } = useI18n()

  return computed(() => {
    const parsed = parseWeightReason(weightReason.value)
    if (!parsed)
      return null

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
