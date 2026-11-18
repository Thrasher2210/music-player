'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Music2 } from 'lucide-react';
import { Container, Button, EmptyState } from '@mp/dying';

export default function NotFound() {
  const router = useRouter();

  return (
    <Container size="xl" className="py-24 px-4 flex items-center justify-center">
      <EmptyState
        icon={<Music2 size={48} className="text-text-tertiary" />}
        title="Page Not Found"
        description="The music page or playlist you are looking for does not exist."
        actionSlot={
          <Button variant="primary" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        }
      />
    </Container>
  );
}
