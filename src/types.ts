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
  httpsPort?: number;
}

export interface OutgoingMessage {
  text?: string;
  imageData?: string;
  mimeType?: string;
  speak?: boolean;
  uiSpec?: UISpec;
}

export interface FrameData {
  data: Buffer;
  timestamp: Date;
  width: number;
  height: number;
  mimeType: string;
}

export interface CertPems {
  key: string;
  cert: string;
}

export interface UISpec {
  root: string;
  elements: Record<string, UIElement>;
}

export interface UIElement {
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
}
