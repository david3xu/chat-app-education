import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || getFileExtension(file.name).toLowerCase() === 'pdf';
}


