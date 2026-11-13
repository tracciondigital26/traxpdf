import React from "react";

export function SeoStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": "https://traxpdf.com/#webapp",
        "name": "TraxPDF",
        "url": "https://traxpdf.com",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "description":
          "Herramienta web gratuita para modificar cualquier documento PDF en línea: editar texto existente, rellenar formularios interactivos y planos, estampar firmas digitales y censurar datos sensibles.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Edición gratuita sin registro de 1 PDF al día, y 3 PDFs al día con cuenta free.",
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "1420",
          "bestRating": "5",
          "worstRating": "1",
        },
        "featureList": [
          "Modificar texto de un PDF en línea",
          "Rellenar formularios PDF interactivos y planos",
          "Firmar documentos PDF con trazo real",
          "Corregir errores con corrector blanco (Whiteout)",
          "Censurar datos confidenciales (Blackout)",
          "Eliminar y rotar páginas de un PDF",
          "Bóveda en la nube cifrada opcional",
          "Procesamiento 100% privado en el navegador",
        ],
      },
      {
        "@type": "HowTo",
        "@id": "https://traxpdf.com/#howto",
        "name": "Cómo modificar un documento PDF en línea gratis",
        "description": "Aprende a editar texto, rellenar formularios o firmar un PDF en segundos sin instalar programas.",
        "totalTime": "PT1M",
        "step": [
          {
            "@type": "HowToStep",
            "position": 1,
            "name": "Sube tu archivo PDF",
            "text": "Arrastra tu documento PDF a la zona de carga de TraxPDF o haz clic en 'Elegir archivo PDF'. El archivo se procesa de inmediato en la memoria de tu navegador.",
          },
          {
            "@type": "HowToStep",
            "position": 2,
            "name": "Modifica, rellena o firma",
            "text": "Utiliza la herramienta 'Editar Texto PDF' para cambiar párrafos existentes, 'Agregar Texto' para rellenar líneas en blanco, o 'Firmar' para colocar tu firma electrónica.",
          },
          {
            "@type": "HowToStep",
            "position": 3,
            "name": "Descarga tu PDF modificado",
            "text": "Haz clic en 'Exportar y Descargar PDF'. Tu documento modificado se descargará al instante conservando la calidad original.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://traxpdf.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "¿Cómo modificar un PDF en línea gratis?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Con TraxPDF solo necesitas arrastrar tu archivo PDF. Nuestra herramienta 'Editar Texto PDF' detecta automáticamente el texto original para que puedas corregir erratas o cambiar datos directamente. Además, puedes tapar texto viejo con el corrector blanco y escribir encima.",
            },
          },
          {
            "@type": "Question",
            "name": "¿Es seguro modificar mis documentos en TraxPDF? ¿Suben a algún servidor?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Es 100% privado y seguro. TraxPDF utiliza tecnología WebAssembly y motores de renderizado que se ejecutan directamente en la memoria de tu navegador web. Tus archivos y datos confidenciales nunca se transmiten ni almacenan en servidores externos a menos que elijas expresamente guardarlos en tu Bóveda en la Nube.",
            },
          },
          {
            "@type": "Question",
            "name": "¿Puedo rellenar formularios en PDFs planos que no tienen campos editables?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sí. TraxPDF está especialmente diseñado para PDFs planos (documentos escaneados o impresos a PDF). Solo haz clic en cualquier línea vacía, casilla o campo para escribir texto, colocar palomitas (✓), cruces (✗) o sellos de fecha.",
            },
          },
          {
            "@type": "Question",
            "name": "¿Cómo firmar un documento PDF en línea?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Haz clic en la herramienta 'Firmar'. Puedes dibujar tu firma a mano con el mouse o pantalla táctil, escribir tu nombre para generar una tipografía manuscrita legal, o subir una imagen PNG de tu firma. Una vez creada, la puedes colocar y escalar donde quieras.",
            },
          },
          {
            "@type": "Question",
            "name": "¿Cuántos PDFs puedo modificar gratis al día?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Puedes modificar 1 PDF al día totalmente gratis y sin necesidad de crear cuenta ni registrarte. Si creas una cuenta gratuita con tu correo, obtienes 3 PDFs gratis al día. Y si necesitas más, puedes recargar créditos de $0.20 USD por documento o contratar el plan Pro Ilimitado.",
            },
          },
          {
            "@type": "Question",
            "name": "¿Puedo eliminar páginas innecesarias de mi PDF antes de descargar?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sí. En el editor de TraxPDF puedes navegar a cualquier página y presionar 'Eliminar pág.'. La página se marcará con una cruz roja en la tira lateral y se excluirá automáticamente al generar el archivo final.",
            },
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
