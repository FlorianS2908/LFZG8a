const fs = require('fs');
const path = require('path');

function extractText(filePath, format) {
  const warnings = [];
  if (!filePath || !fs.existsSync(filePath)) {
    return { text: '', sections: [], warnings: ['Quelldatei nicht gefunden.'], searchable: false };
  }

  try {
    if (['txt', 'md', 'html'].includes(format)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return { text: stripHtml(raw), sections: [{ sectionTitle: 'Dokument', text: stripHtml(raw) }], warnings, searchable: Boolean(raw.trim()) };
    }

    const raw = fs.readFileSync(filePath);
    const text = raw.toString('latin1')
      .replace(/[^\x09\x0a\x0d\x20-\x7e\u00c0-\u017f]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (format === 'pdf') {
      warnings.push('PDF-Extraktion nutzt im MVP eine sichere Text-Fallback-Erkennung ohne Bilder oder Seitenkopien.');
      return { text, sections: text ? [{ sectionTitle: 'PDF-Text-Fallback', pageNumber: null, text }] : [], warnings, searchable: text.length > 0 };
    }

    if (format === 'epub') {
      warnings.push('EPUB wird lokal registriert. Vollstaendige Kapitel-Extraktion ist im MVP vorbereitet, aber ohne ZIP/XML-Abhaengigkeit nur eingeschraenkt verfuegbar.');
      return { text: '', sections: [], warnings, searchable: false };
    }

    warnings.push('Format wird registriert, aber noch nicht voll extrahiert.');
    return { text: '', sections: [], warnings, searchable: false };
  } catch (error) {
    return { text: '', sections: [], warnings: [`Extraktion fehlgeschlagen: ${error.message}`], searchable: false };
  }
}

function stripHtml(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

module.exports = {
  extractText
};
