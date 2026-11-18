import Link from 'next/link';
import { Box, Stack, Heading, Text, Button } from '@mp/dying';

export default function NotFound() {
  return (
    <Box className="flex min-h-screen flex-col items-center justify-center bg-canvas text-text-primary p-6">
      <Stack align="center" gap="4" className="text-center">
        <Heading level={2}>Page Not Found</Heading>
        <Text color="secondary" size="sm">Could not find requested resource</Text>
        <Link href="/">
          <Button variant="primary" size="md">
            Return Home
          </Button>
        </Link>
      </Stack>
    </Box>
  );
}

