import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import { routing } from "../../i18n/routing";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Validate locale
  if (!locale || !routing.locales.includes(locale as any)) {
    notFound();
  }
  
  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // getMessages will use the locale from setRequestLocale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}

