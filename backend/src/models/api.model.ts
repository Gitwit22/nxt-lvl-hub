export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error: string | null;
}

export interface DatabaseStatus {
  mode: "file-json";
  databaseUrlConfigured: boolean;
  storagePath: string;
}