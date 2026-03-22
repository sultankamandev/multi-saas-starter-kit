import { useEffect, useRef, useCallback } from "react";
import axios, { CancelTokenSource, CancelToken } from "axios";

export function useApiRequest<T>() {
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const makeRequest = useCallback(async (requestFn: (cancelToken: CancelToken) => Promise<{ data: T }>): Promise<T | null> => {
    if (cancelTokenRef.current) cancelTokenRef.current.cancel("Request cancelled");
    cancelTokenRef.current = axios.CancelToken.source();
    try {
      const response = await requestFn(cancelTokenRef.current.token);
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) return null;
      throw error;
    }
  }, []);

  useEffect(() => {
    return () => { cancelTokenRef.current?.cancel("Component unmounted"); };
  }, []);

  return { makeRequest };
}
