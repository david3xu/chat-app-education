export async function createHash(content: string): Promise<string> {
  // Use Web Crypto API for client-side
  if (typeof window !== 'undefined') {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Use Node.js crypto for server-side
  // Dynamic import to avoid bundling issues
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}
