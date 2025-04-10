import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Throw an error if the response is not OK, including detailed error message if available
 */
export async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let message = `HTTP Error ${res.status}`;
    let error = undefined;

    try {
      // Try to parse JSON error message
      const json = await res.json();
      if (json.message) {
        message = json.message;
      } else if (json.error) {
        message = json.error;
      }
      error = json;
    } catch (_) {
      // If not JSON, try to get text
      try {
        message = await res.text();
      } catch (_) {
        // If all else fails, use default message
      }
    }

    const httpError = new Error(message);
    (httpError as any).status = res.status;
    (httpError as any).error = error;
    throw httpError;
  }
}

/**
 * Helper to create fetch requests with the correct headers for API requests
 */
export const apiRequest = async (method: string, url: string, data?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const res = await fetch(url, options);

  await throwIfResNotOk(res);

  // Return the response object (not parsed) for more flexibility
  return res;
};

/**
 * Helper for admin API requests that need to include the session ID
 */
export const adminApiRequest = async (method: string, url: string, data?: any) => {
  // Get admin session ID from sessionStorage
  const sessionId = sessionStorage.getItem("adminSessionId");
  const isAdminAuth = sessionStorage.getItem("adminAuthenticated") === "true";
  
  // Prepare headers with session ID if available
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Try session-based auth first
  if (sessionId) {
    headers["admin-session-id"] = sessionId;
  }
  
  // Add admin key if available (for serverless environments like Vercel)
  const adminKey = import.meta.env.VITE_ADMIN_KEY || "admin-secret";
  if (adminKey) {
    headers["x-admin-key"] = adminKey;
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: "include",
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const res = await fetch(url, options);
  
  await throwIfResNotOk(res);
  
  // Return nothing for 204 No Content
  if (res.status === 204) {
    return;
  }
  
  return res.json();
};

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error("Error in query function:", error);
      
      // If we should return null on error
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      throw error;
    }
  };

/**
 * Query function for admin endpoints that need to include the session ID
 * Also supports admin key authentication for serverless environments
 */
export const getAdminQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get admin session ID from sessionStorage
    const sessionId = sessionStorage.getItem("adminSessionId");
    const isAdminAuth = sessionStorage.getItem("adminAuthenticated") === "true";
    
    console.log("getAdminQueryFn executing with:", { 
      sessionId, 
      isAdminAuth, 
      queryKey 
    });
    
    // If we don't have a session ID and we're not authenticated, return null early
    // But only if we also don't have an admin key available
    const adminKey = import.meta.env.VITE_ADMIN_KEY;
    if (!sessionId && !isAdminAuth && !adminKey && unauthorizedBehavior === "returnNull") {
      console.log("No admin authentication found, returning null");
      return null;
    }
    
    // Prepare headers with session ID if available
    const headers: Record<string, string> = {};
    
    // Try session-based auth first
    if (sessionId) {
      headers["admin-session-id"] = sessionId;
    }
    
    // Add admin key if available (for serverless environments like Vercel)
    if (adminKey) {
      headers["x-admin-key"] = adminKey;
      console.log("Added admin key to query request");
    }
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers,
      });
  
      console.log(`Admin API response for ${queryKey[0]}:`, { 
        status: res.status,
        ok: res.ok,
      });
  
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        // Clear stored session on 401
        console.log("Received 401, clearing session data");
        sessionStorage.removeItem("adminAuthenticated");
        sessionStorage.removeItem("adminSessionId");
        return null;
      }
  
      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error("Error in admin query function:", error);
      
      // If we should return null on error with 401-related errors
      if (unauthorizedBehavior === "returnNull") {
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});