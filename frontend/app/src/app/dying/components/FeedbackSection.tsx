'use client';

import React, { useState } from 'react';
import {
  Text,
  Heading,
  Grid,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Flex,
  Stack,
  Badge,
  Alert,
  Button,
  Tooltip,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  FormField,
  Select,
  Switch,
} from '@mp/dying';
import { HelpCircle, ListPlus, MoreHorizontal, Trash2 } from 'lucide-react';

export function FeedbackSection() {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-1">
        <Text variant="kicker" size="xs">Components · Overlays</Text>
        <Heading level={2} size="h2">Feedback, Badges &amp; Accessible Modals</Heading>
        <Text variant="secondary" size="sm">
          Status indicators, banners, and Radix-backed focus-trapped dialogs.
        </Text>
      </div>

      <Grid cols={2} gap="6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Status Badges &amp; Alerts</CardTitle>
            <CardDescription>Semantic metadata tags and alert notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Flex gap="2" wrap="wrap">
              <Badge variant="accent">LOSSLESS</Badge>
              <Badge variant="success" dot={true}>Synced</Badge>
              <Badge variant="warning">Buffering</Badge>
              <Badge variant="error">Offline</Badge>
              <Badge variant="glass">OLED Mode</Badge>
            </Flex>

            <Alert
              variant="info"
              title="Spatial Audio Available"
            >
              This recording has been mastered for Dolby Atmos immersive playback.
            </Alert>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Accessible Dialog Modal</CardTitle>
            <CardDescription>Radix Dialog with focus trapping, backdrop blur, and Escape dismissal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="primary">Open Accessible Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Audio Engine Settings</DialogTitle>
                  <DialogDescription>Configure streaming buffers and network fallback.</DialogDescription>
                </DialogHeader>
                <Stack gap="3" className="py-2">
                  <FormField label="Output Device">
                    <Select>
                      <option>Studio Headphones (External DAC)</option>
                      <option>MacBook Pro Built-in Speakers</option>
                    </Select>
                  </FormField>
                  <Switch label="Sound Check Volume Normalization" checked={true} />
                </Stack>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button variant="primary" onClick={() => setIsDialogOpen(false)}>Save Preferences</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Tooltip content="Audio Engine Bitrate: 320kbps Opus">
              <Button variant="glass" leftIcon={<HelpCircle size={16} />}>
                Hover for Tooltip
              </Button>
            </Tooltip>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Dropdown Menu</CardTitle>
            <CardDescription>
              Radix menu with arrow-key navigation, typeahead, Escape dismissal and a destructive item style.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" leftIcon={<MoreHorizontal size={16} />}>
                  Open menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Track</DropdownMenuLabel>
                <DropdownMenuItem icon={<ListPlus size={16} />}>Add to playlist</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={<Trash2 size={16} />} destructive>
                  Remove from this playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </Grid>
    </section>
  );
}
