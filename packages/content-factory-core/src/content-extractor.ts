import type { UploadedFileDescriptor } from './types.ts';

export function extractRelevantContent(files: UploadedFileDescriptor[]): Array<{ sourceRef: string; text: string }> {
  return files
    .filter((file) => file.contentText)
    .map((file, index) => ({
      sourceRef: file.fileId || file.relativePath || file.fileName || `source-${index + 1}`,
      text: file.contentText || ''
    }));
}
