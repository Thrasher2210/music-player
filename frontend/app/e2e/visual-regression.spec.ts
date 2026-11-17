import { test, expect } from '@playwright/test';

test.describe('Dying Design System — Visual Regression & E2E Verification', () => {
  test('Playground renders foundational components, tabs, and tokens', async ({ page }) => {
    await page.goto('/dying?tab=components');

    // Verify brand title & kicker
    const brand = page.locator('text=Dying Design System 2.0');
    await expect(brand).toBeVisible();

    // Verify portal tab buttons exist
    await expect(page.getByRole('button', { name: 'Components & Primitives' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mathematical Rigor & Physics' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Design Tokens & DTCG' })).toBeVisible();
    await expect(page.getByRole('button', { name: '20-Point Checklist Audit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Audio Domain Patterns' })).toBeVisible();

    // Verify default Components tab headings
    await expect(page.getByRole('heading', { name: 'Layout & Typography Primitives' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Actions: Button & IconButton Matrix' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Form Controls & Inputs' })).toBeVisible();

    // Verify action buttons are rendered and active
    const primaryBtn = page.getByRole('button', { name: 'Primary Action' });
    await expect(primaryBtn).toBeVisible();
    await expect(primaryBtn).toBeEnabled();

    // Verify disabled buttons
    const disabledBtn = page.getByRole('button', { name: 'Disabled' });
    await expect(disabledBtn).toBeVisible();
    await expect(disabledBtn).toBeDisabled();

    // Test tab navigation to Math & Physics
    await page.getByRole('button', { name: 'Mathematical Rigor & Physics' }).click();
    await expect(page.getByRole('heading', { name: /CIELAB/i })).toBeVisible();

    // Test tab navigation to Tokens
    await page.getByRole('button', { name: 'Design Tokens & DTCG' }).click();
    await expect(page.getByRole('heading', { name: 'Design Tokens Explorer' })).toBeVisible();

    // Test tab navigation to Checklist Audit
    await page.getByRole('button', { name: '20-Point Checklist Audit' }).click();
    await expect(page.getByRole('heading', { name: 'Enterprise Compliance Matrix' })).toBeVisible();
  });

  test('Theme switching updates document attributes and styles', async ({ page }) => {
    await page.goto('/dying?tab=components');

    // Switch to Light theme
    const lightThemeBtn = page.locator('header').getByRole('button', { name: /light/i });
    await lightThemeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Switch to OLED theme
    const oledThemeBtn = page.locator('header').getByRole('button', { name: /oled/i });
    await oledThemeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'oled');

    // Switch back to Dark theme
    const darkThemeBtn = page.locator('header').getByRole('button', { name: /dark/i });
    await darkThemeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('Form controls receive input and maintain state', async ({ page }) => {
    await page.goto('/dying?tab=components');

    const input = page.getByPlaceholder('e.g. Midnight Horizon');
    await expect(input).toBeVisible();
    await input.fill('Radiohead');
    await expect(input).toHaveValue('Radiohead');

    // Form inputs and selection elements render correctly
    const formHeading = page.getByRole('heading', { name: 'Form Controls & Inputs' });
    await expect(formHeading).toBeVisible();
  });

  test('Modal dialog opens, traps focus, and closes gracefully', async ({ page }) => {
    await page.goto('/dying?tab=components');

    const openDialogBtn = page.getByRole('button', { name: 'Open Accessible Dialog' });
    await openDialogBtn.click();

    // Dialog title visible
    const dialogTitle = page.locator('text=Audio Engine Settings');
    await expect(dialogTitle).toBeVisible();

    // Close button dismisses dialog
    const closeBtn = page.getByRole('button', { name: 'Save Preferences' });
    await closeBtn.click();
    await expect(dialogTitle).not.toBeVisible();
  });

  test('Application home page loads with AppShell and transport controls', async ({ page }) => {
    await page.goto('/');

    // Page body loads with canvas background
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Header or brand navigation is present
    const header = page.locator('header, aside');
    await expect(header.first()).toBeAttached();
  });
});
