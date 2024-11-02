// Handles both File and Blob objects, and works on both client and server
export const encodeImageToBase64 = async (file: File | Blob): Promise<string> => {
  if (typeof window === 'undefined') {
    const buffer = await file.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};

export const convertBlobToBase64 = encodeImageToBase64; // Alias for backward compatibility

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || getFileExtension(file.name).toLowerCase() === 'pdf';
}

export async function encodeImage(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}
