"use client";

import { useState, useCallback } from "react";

interface UploadResult {
  id: string;
  name: string;
  url: string;
  signedUrl: string;
  mimeType: string;
  size: number;
}

interface UseFileUploadOptions {
  endpoint?: string;
  onSuccess?: (results: UploadResult[]) => void;
  onError?: (error: Error) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { endpoint = "/api/uploads", onSuccess, onError } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      const uploadedResults: UploadResult[] = [];
      const total = files.length;
      let completed = 0;

      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Upload failed for ${file.name}`,
            );
          }

          const data = await response.json();
          uploadedResults.push({
            id: data.id,
            name: data.name || file.name,
            url: data.url,
            signedUrl: data.signedUrl,
            mimeType: data.mimeType || file.type,
            size: data.size || file.size,
          });

          completed++;
          setProgress(Math.round((completed / total) * 100));
        }

        setResults(uploadedResults);
        onSuccess?.(uploadedResults);
        return uploadedResults;
      } catch (err) {
        const uploadError =
          err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        onError?.(uploadError);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [endpoint, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setResults([]);
    setError(null);
    setProgress(0);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    results,
    error,
    reset,
  };
}
