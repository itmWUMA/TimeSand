<template>
  <DefaultLayout>
    <RouterView />
  </DefaultLayout>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";

import DefaultLayout from "./layouts/DefaultLayout.vue";
</script>
