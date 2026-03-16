/// <reference types="vite/client" />

interface FBLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
}

interface FB {
  init(params: { appId: string; cookie: boolean; xfbml: boolean; version: string }): void;
  login(callback: (response: FBLoginStatusResponse) => void, options?: { scope: string; auth_type?: string }): void;
  logout(callback?: () => void): void;
  getLoginStatus(callback: (response: FBLoginStatusResponse) => void): void;
}

declare const FB: FB;
