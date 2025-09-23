// src/forwarder/interfaces/forwarder-response.interface.ts

export interface ForwarderResponseMeta {
  status: number;
  statusText: string;
  // This is the key change: we use a generic, nameable type
  headers: Record<string, any>;
}

export interface ForwarderResponse {
  ok: boolean;
  meta: ForwarderResponseMeta;
  bodyJson?: unknown;
  bodyBase64?: string;
  bodyEncoding?: 'base64';
}
