import type { Metadata } from 'next';

const appName = 'SaaS Starter';

const descriptions: Record<string, string> = {
  en: 'Production-ready SaaS boilerplate with authentication, admin console, i18n, and API integration. Built with Next.js and Go.',
  tr: 'Kimlik doğrulama, yönetici konsolu, i18n ve API entegrasyonu içeren üretime hazır SaaS şablonu. Next.js ve Go ile geliştirildi.',
  de: 'Produktionsreife SaaS-Vorlage mit Authentifizierung, Admin-Konsole, i18n und API-Integration. Erstellt mit Next.js und Go.',
  fr: 'Modèle SaaS prêt pour la production avec authentification, console d\'administration, i18n et intégration API. Construit avec Next.js et Go.',
};

export function generatePageMetadata(locale: string): Metadata {
  return {
    title: appName,
    description: descriptions[locale] ?? descriptions.en,
    applicationName: appName,
  };
}
