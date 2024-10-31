export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 5, 
  initialTimeout: number = 5000
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = initialTimeout * Math.pow(2, i); // Exponential backoff
      const id = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { 
        ...options, 
        signal: controller.signal 
      });
      
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      if (error instanceof DOMException && (error as DOMException).name === 'AbortError') {
        console.warn(`Request timeout after ${initialTimeout * Math.pow(2, i)}ms`);
      }
      
      if (i === retries - 1) throw error;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('All fetch attempts failed');
}
