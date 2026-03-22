<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props" variant="text" size="small">
        {{ LOCALE_DISPLAY_CONFIG[currentLocale].flag }} {{ LOCALE_DISPLAY_CONFIG[currentLocale].name }}
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        v-for="loc in SUPPORTED_LOCALES"
        :key="loc"
        :active="currentLocale === loc"
        @click="changeLocale(loc)"
      >
        {{ LOCALE_DISPLAY_CONFIG[loc].flag }} {{ LOCALE_DISPLAY_CONFIG[loc].name }}
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { SUPPORTED_LOCALES, LOCALE_DISPLAY_CONFIG, setLocale, type Locale } from "@/i18n";

const { locale } = useI18n();
const currentLocale = computed(() => locale.value as Locale);

async function changeLocale(loc: Locale) {
  await setLocale(loc);
}
</script>
