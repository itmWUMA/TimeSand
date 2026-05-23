import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

import AlbumDetailPage from '../pages/AlbumDetailPage.vue'
import AlbumsPage from '../pages/AlbumsPage.vue'
import HomePage from '../pages/HomePage.vue'
import LandingPage from '../pages/LandingPage.vue'
import MusicPage from '../pages/MusicPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'
import SlideshowPage from '../pages/SlideshowPage.vue'
import UploadPage from '../pages/UploadPage.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'landing', component: LandingPage, meta: { shell: false } },
  { path: '/draw', name: 'draw', component: HomePage },
  { path: '/home', redirect: '/draw' },
  { path: '/debug/onboarding', name: 'onboarding-debug', component: HomePage },
  { path: '/albums', name: 'albums', component: AlbumsPage },
  { path: '/albums/:id', name: 'album-detail', component: AlbumDetailPage },
  { path: '/upload', name: 'upload', component: UploadPage },
  { path: '/music', name: 'music', component: MusicPage },
  {
    path: '/slideshow/:albumId',
    name: 'slideshow-album',
    component: SlideshowPage,
    meta: { shell: false },
  },
  { path: '/slideshow', name: 'slideshow', component: SlideshowPage, meta: { shell: false } },
  { path: '/settings', name: 'settings', component: SettingsPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
