import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

import AlbumDetailPage from '../pages/AlbumDetailPage.vue'
import AlbumsPage from '../pages/AlbumsPage.vue'
import HomePage from '../pages/HomePage.vue'
import LandingPage from '../pages/LandingPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import MusicPage from '../pages/MusicPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'
import SlideshowPage from '../pages/SlideshowPage.vue'
import UploadPage from '../pages/UploadPage.vue'
import { useAuthStore } from '../stores/auth'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'landing', component: LandingPage, meta: { shell: false } },
  { path: '/login', name: 'login', component: LoginPage, meta: { shell: false } },
  { path: '/draw', name: 'draw', component: HomePage, meta: { requiresAuth: true } },
  { path: '/home', redirect: '/draw' },
  { path: '/debug/onboarding', name: 'onboarding-debug', component: HomePage, meta: { requiresAuth: true } },
  { path: '/albums', name: 'albums', component: AlbumsPage, meta: { requiresAuth: true } },
  { path: '/albums/:id', name: 'album-detail', component: AlbumDetailPage, meta: { requiresAuth: true } },
  { path: '/upload', name: 'upload', component: UploadPage, meta: { requiresAuth: true } },
  { path: '/music', name: 'music', component: MusicPage, meta: { requiresAuth: true } },
  {
    path: '/slideshow/:albumId',
    name: 'slideshow-album',
    component: SlideshowPage,
    meta: { shell: false, requiresAuth: true },
  },
  { path: '/slideshow', name: 'slideshow', component: SlideshowPage, meta: { shell: false, requiresAuth: true } },
  { path: '/settings', name: 'settings', component: SettingsPage, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized)
    await auth.fetchMe()

  if (to.name === 'login' && auth.isAuthenticated)
    return typeof to.query.redirect === 'string' ? to.query.redirect : '/draw'

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin)
    return '/draw'

  return true
})

export default router
