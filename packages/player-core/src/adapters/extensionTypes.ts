export interface ExtensionBridgeRequest {
  type: 'MP_EXT_FETCH_REQUEST';
  requestId: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ExtensionBridgeResponse {
  type: 'MP_EXT_FETCH_RESPONSE';
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  error?: string;
}
