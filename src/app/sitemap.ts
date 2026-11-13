import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://traxpdf.tracciondigital.com.mx";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: {
          es: `${baseUrl}?lang=es`,
          en: `${baseUrl}?lang=en`,
        },
      },
    },
  ];
}
