'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, Skeleton } from '@mp/dying';

function WatchRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const v = searchParams.get('v');
    const target = v ? `/?v=${v}` : '/';
    router.replace(target);
  }, [router, searchParams]);

  return (
    <Container size="xl" className="py-24 px-4">
      <Skeleton className="h-64 w-full rounded-2xl" />
    </Container>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={null}>
      <WatchRedirectContent />
    </Suspense>
  );
}
