import type { Photo } from '../types/photo'

import { defineStore } from 'pinia'

export interface DrawnCard {
  photo: Photo
  weightReason: string | null
  pileOffsetX: number
  pileRotation: number
  scatterX: number
  scatterY: number
  scatterRotation: number
}

interface AddDrawnCardPayload {
  photo: Photo
  weightReason?: string | null
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const randomBetween = (min: number, max: number): number => Math.random() * (max - min) + min

function buildDrawnCard(payload: AddDrawnCardPayload, index: number): DrawnCard {
  return {
    photo: payload.photo,
    weightReason: payload.weightReason ?? null,
    pileOffsetX: clamp(index * 6, -24, 24) + randomBetween(-6, 6),
    pileRotation: randomBetween(-8, 8),
    scatterX: randomBetween(-40, 40),
    scatterY: randomBetween(-28, 28),
    scatterRotation: randomBetween(-24, 24),
  }
}

export const useDrawStore = defineStore('draw', {
  state: () => ({
    drawnCards: [] as DrawnCard[],
    excludeIds: [] as number[],
    albumId: null as number | null,
  }),
  getters: {
    activeCard: (state): DrawnCard | null => state.drawnCards.at(-1) ?? null,
    pileCards: (state): DrawnCard[] => state.drawnCards.slice(0, -1).slice(-5),
  },
  actions: {
    addDrawnCard(payload: AddDrawnCardPayload): void {
      if (this.excludeIds.includes(payload.photo.id)) {
        return
      }

      this.drawnCards.push(buildDrawnCard(payload, this.drawnCards.length))
      this.excludeIds.push(payload.photo.id)
    },
    undoLastDraw(): DrawnCard | null {
      const card = this.drawnCards.pop() ?? null
      if (!card) {
        return null
      }

      this.excludeIds = this.excludeIds.filter(photoId => photoId !== card.photo.id)
      return card
    },
    resetSession(): void {
      this.drawnCards = []
      this.excludeIds = []
      this.albumId = null
    },
    setAlbumFilter(albumId: number | null): void {
      this.albumId = albumId
    },
  },
})
