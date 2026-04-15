const META_PIXEL_ID = '1499668131837471';
const META_PIXEL_SCRIPT = 'https://connect.facebook.net/en_US/fbevents.js';

type MetaPixelFn = ((...args: any[]) => void) & {
  callMethod?: (...args: any[]) => void;
  queue?: any[];
  push?: MetaPixelFn;
  loaded?: boolean;
  version?: string;
};

type MetaPixelWindow = Window & typeof globalThis & {
  fbq?: MetaPixelFn;
  _fbq?: MetaPixelFn;
  __metaPixelInitialized?: boolean;
};

export const ensureMetaPixel = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const metaWindow = window as MetaPixelWindow;

  if (typeof metaWindow.fbq !== 'function') {
    const fbq = ((...args: any[]) => {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, args);
        return;
      }

      fbq.queue?.push(args);
    }) as MetaPixelFn;

    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    metaWindow.fbq = fbq;
    if (!metaWindow._fbq) {
      metaWindow._fbq = fbq;
    }
  }

  if (!document.querySelector(`script[data-meta-pixel="${META_PIXEL_ID}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = META_PIXEL_SCRIPT;
    script.dataset.metaPixel = META_PIXEL_ID;
    document.head.appendChild(script);
  }

  if (!metaWindow.__metaPixelInitialized) {
    metaWindow.fbq?.('init', META_PIXEL_ID);
    metaWindow.__metaPixelInitialized = true;
  }

  return metaWindow.fbq ?? null;
};

export const trackMetaEvent = (eventName: string, parameters?: Record<string, unknown>) => {
  const fbq = ensureMetaPixel();

  if (typeof fbq !== 'function') {
    return false;
  }

  fbq('track', eventName, parameters);
  return true;
};