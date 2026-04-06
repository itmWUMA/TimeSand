import { createRouter, createWebHistory } from "vue-router";

import AlbumDetailPage from "../pages/AlbumDetailPage.vue";
import AlbumsPage from "../pages/AlbumsPage.vue";
import HomePage from "../pages/HomePage.vue";
import MusicPage from "../pages/MusicPage.vue";
import SettingsPage from "../pages/SettingsPage.vue";
import SlideshowPage from "../pages/SlideshowPage.vue";
import UploadPage from "../pages/UploadPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomePage },
    { path: "/albums", name: "albums", component: AlbumsPage },
    { path: "/albums/:id", name: "album-detail", component: AlbumDetailPage },
    { path: "/upload", name: "upload", component: UploadPage },
    { path: "/music", name: "music", component: MusicPage },
    { path: "/slideshow", name: "slideshow", component: SlideshowPage },
    { path: "/settings", name: "settings", component: SettingsPage }
  ]
});

export default router;
