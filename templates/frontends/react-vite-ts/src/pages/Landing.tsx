import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/lib/routes";

const features = ["auth", "admin", "i18n", "api"] as const;

const featureIcons: Record<(typeof features)[number], ReactNode> = {
  auth: (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  admin: (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
  ),
  i18n: (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
    </svg>
  ),
  api: (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
    </svg>
  ),
};

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-24 text-center text-white sm:py-32 lg:px-8">
        <div className="absolute inset-0 -z-10 opacity-20" aria-hidden="true">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-purple-400/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-6 text-lg leading-8 text-indigo-100 sm:text-xl">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to={ROUTES.REGISTER}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t("landing.hero.getStarted")}
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t("landing.hero.signIn")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("landing.features.title")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-600 dark:text-gray-400">
          {t("landing.features.subtitle")}
        </p>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((key) => (
            <div
              key={key}
              className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-600"
            >
              <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                {featureIcons[key]}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t(`landing.features.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {t(`landing.features.items.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-20 text-center text-white lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("landing.cta.title")}
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            {t("landing.cta.subtitle")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to={ROUTES.REGISTER}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
            >
              {t("landing.cta.getStarted")}
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              {t("landing.cta.signIn")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
