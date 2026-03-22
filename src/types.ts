export interface PhotoMeta {
  filename: string;
  absolutePath: string;
  timestamp: Date;
  sizeBytes: number;
  mimeType: string;
}

export interface ServerConfig {
  port: number;
  outputDir: string;
  token: string;
  host: string;
}

export interface OutgoingMessage {
  text?: string;
  imageData?: string;
  mimeType?: string;
}
