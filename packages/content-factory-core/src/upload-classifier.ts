import type { FileAnalysis, UploadedFileDescriptor } from './types.ts';
import { classifyUploadedFile } from './file-type-rules.ts';

export function classifyUploads(files: UploadedFileDescriptor[]): FileAnalysis[] {
  return files.map((file) => classifyUploadedFile(file));
}
