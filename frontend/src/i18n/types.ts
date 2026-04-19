import type zhCN from './locales/zh-CN'

type LocaleSchema<T> = T extends string
  ? string
  : { [K in keyof T]: LocaleSchema<T[K]> }

export type MessageSchema = LocaleSchema<typeof zhCN>
