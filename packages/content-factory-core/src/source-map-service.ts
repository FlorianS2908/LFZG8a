import type { DayMapping } from './types.ts';

export function createSourceMap(mappings: DayMapping[]) {
  return {
    generatedAt: new Date().toISOString(),
    days: mappings.map((mapping) => ({
      dayNumber: mapping.dayNumber,
      sources: mapping.files.map((file) => ({
        fileId: file.fileId,
        fileName: file.fileName,
        sourcePath: file.sourcePath,
        category: file.contentCategory,
        confidence: file.confidence
      }))
    }))
  };
}
