export const encodeImageToBase64 = async (file: File | Blob): Promise<string> => {
  if (typeof window === 'undefined') {
    // Server-side
    const buffer = await file.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } else {
    // Client-side
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};
