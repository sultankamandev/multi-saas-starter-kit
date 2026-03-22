<template>
  <div class="flex flex-col">
    <section class="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-24 text-center text-white sm:py-32 lg:px-8">
      <div class="mx-auto max-w-3xl">
        <h1 class="text-4xl font-extrabold tracking-tight sm:text-6xl">
          {{ t("landing.hero.title") }}
        </h1>
        <p class="mt-6 text-lg leading-8 text-indigo-100 sm:text-xl">
          {{ t("landing.hero.subtitle") }}
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <router-link
            to="/register"
            class="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
          >
            {{ t("landing.hero.ctaPrimary") }}
          </router-link>
          <router-link
            to="/login"
            class="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            {{ t("landing.cta.login") }}
          </router-link>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <h2 class="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {{ t("landing.features.title") }}
      </h2>
      <div class="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="key in features"
          :key="key"
          class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        >
          <h3 class="text-lg font-semibold text-gray-900">
            {{ t(`landing.features.items.${key}.title`) }}
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-gray-600">
            {{ t(`landing.features.items.${key}.description`) }}
          </p>
        </div>
      </div>
    </section>

    <section class="bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-20 text-center text-white lg:px-8">
      <div class="mx-auto max-w-2xl">
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
          {{ t("landing.cta.title") }}
        </h2>
        <p class="mt-4 text-lg text-indigo-100">
          {{ t("landing.cta.description") }}
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <router-link
            to="/register"
            class="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
          >
            {{ t("landing.cta.button") }}
          </router-link>
          <router-link
            to="/login"
            class="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            {{ t("landing.cta.login") }}
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const features = ["auth", "admin", "i18n", "api"] as const;
</script>
