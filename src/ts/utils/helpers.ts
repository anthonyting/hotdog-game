export function isMobileDevice(): boolean {
  // from https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
  let hasTouchScreen = false;
  if ('maxTouchPoints' in navigator) {
    hasTouchScreen = navigator.maxTouchPoints > 0;
  } else if ('msMaxTouchPoints' in navigator) {
    hasTouchScreen = (navigator as any).msMaxTouchPoints > 0;
  } else {
    const mQ = window.matchMedia && matchMedia('(pointer:coarse)');
    if (mQ && mQ.media === '(pointer:coarse)') {
      hasTouchScreen = !!mQ.matches;
    } else if ('orientation' in window) {
      hasTouchScreen = true; // deprecated, but good fallback
    } else {
      // Only as a last resort, fall back to user agent sniffing
      const UA = navigator.userAgent;
      hasTouchScreen =
        /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
        /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
    }
  }

  return hasTouchScreen;
}

const loadedImages: Record<string, HTMLImageElement> = {};

export async function getImage(src: string): Promise<HTMLImageElement> {
  if (loadedImages[src]) {
    return loadedImages[src];
  }

  const img = new Image();
  return new Promise((resolve, reject) => {
    img.addEventListener(
      'load',
      () => {
        loadedImages[src] = img;
        resolve(img);
        img.removeEventListener('error', reject);
      },
      {
        once: true,
      },
    );
    img.addEventListener('error', reject, {
      once: true,
    });
    img.src = src;
  });
}