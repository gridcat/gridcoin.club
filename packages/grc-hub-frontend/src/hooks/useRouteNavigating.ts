import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

/** Returns true while the Next.js router is mid-transition. */
export function useRouteNavigating(): boolean {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const start = () => setNavigating(true);
    const done = () => setNavigating(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router.events]);

  return navigating;
}
