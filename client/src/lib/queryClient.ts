import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

class APIError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      return response;
    } catch (error: any) {
      lastError = error;
      
      if (error.name === 'AbortError') {
        throw new APIError('La solicitud tardó demasiado tiempo', 408);
      }
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
        continue;
      }
    }
  }
  
  throw lastError || new APIError('Error de conexión', 0);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const text = await res.clone().text();
      if (text) {
        try {
          const data = JSON.parse(text);
          message = data.message || data.error || message;
        } catch {
          message = text;
        }
      }
    } catch {
      // Ignore read errors
    }
    throw new APIError(`${res.status}: ${message}`, res.status);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  options: { timeout?: number; retries?: number } = {}
): Promise<Response> {
  const { timeout = API_TIMEOUT, retries = method === 'GET' ? MAX_RETRIES : 0 } = options;
  
  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  };

  const res = method === 'GET' 
    ? await fetchWithRetry(url, fetchOptions, retries)
    : await fetchWithTimeout(url, fetchOptions, timeout);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    try {
      const res = await fetchWithTimeout(
        queryKey[0] as string,
        {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          signal,
        },
        API_TIMEOUT
      );

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});
