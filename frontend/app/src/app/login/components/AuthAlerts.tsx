'use client';

import React from 'react';
import { Alert, Stack, Box, Text, Button } from '@mp/dying';
import { Check, Sparkles } from 'lucide-react';

export interface AuthAlertsProps {
  errorMessage: string | null;
  onClearError: () => void;
  oauthWarning: { provider: string; message: string } | null;
  onClearWarning: () => void;
  onCreateDemoAccount: () => void;
  statusMessage: string | null;
  isLoading: boolean;
}

export function AuthAlerts({
  errorMessage,
  onClearError,
  oauthWarning,
  onClearWarning,
  onCreateDemoAccount,
  statusMessage,
  isLoading,
}: AuthAlertsProps) {
  return (
    <>
      {errorMessage && (
        <Alert
          variant="error"
          title="Authentication Failed"
          onClose={onClearError}
          className="text-xs py-2.5"
        >
          {errorMessage}
        </Alert>
      )}

      {oauthWarning && (
        <Alert
          variant="warning"
          title={`${oauthWarning.provider} OAuth Unavailable`}
          onClose={onClearWarning}
          className="text-xs py-2.5"
        >
          <Stack gap="2">
            <Text size="xs" color="secondary">
              {oauthWarning.message}
            </Text>
            <Box>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                leftIcon={<Sparkles size={13} />}
                onClick={onCreateDemoAccount}
                disabled={isLoading}
              >
                Create Demo Account (1-Click)
              </Button>
            </Box>
          </Stack>
        </Alert>
      )}

      {statusMessage && (
        <Alert
          variant="success"
          icon={<Check size={15} />}
          className="text-xs py-2.5"
        >
          {statusMessage}
        </Alert>
      )}
    </>
  );
}
