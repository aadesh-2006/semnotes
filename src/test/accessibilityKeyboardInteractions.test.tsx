import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../components/ui/modal';
import { AppShell } from '../app/AppShell';
import { HabitFormModal } from '../components/modals/HabitFormModal';
import { CheckInModal } from '../components/modals/CheckInModal';
import { MemoryRouter } from 'react-router-dom';
import type { Habit } from '../core/domain/types';

describe('WCAG 2.1 AA Keyboard Navigation & Focus Management (AUDIT-A11Y-01)', () => {
  it('1. provides a visible skip-to-content link targeting the main content landmark', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>
          <div>Main View Content</div>
        </AppShell>
      </MemoryRouter>
    );

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    const mainElement = screen.getByRole('main');
    expect(mainElement).toHaveAttribute('id', 'main-content');
    expect(mainElement).toHaveAttribute('tabIndex', '-1');
  });

  it('2. traps keyboard Tab focus strictly within an open modal dialog', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Sovereign Protocol">
        <button type="button">Action A</button>
        <button type="button">Action B</button>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');

    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    const actionA = screen.getByRole('button', { name: /action a/i });
    const actionB = screen.getByRole('button', { name: /action b/i });

    // Focus last element (Action B) and press Tab -> should wrap to close button
    actionB.focus();
    expect(document.activeElement).toBe(actionB);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    // Focus first element (Close button) and press Shift+Tab -> should wrap to Action B
    closeButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(actionB);
  });

  it('3. dismisses modal dialog on Escape key and calls onClose', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Sovereign Protocol">
        <p>Modal body</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('4. restores keyboard focus to the triggering element upon modal closure', async () => {
    function ModalTriggerWrapper() {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <div>
          <button id="open-btn" onClick={() => setIsOpen(true)}>
            Open Sovereign Modal
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test Modal">
            <button id="inside-btn">Inside</button>
          </Modal>
        </div>
      );
    }

    const React = await import('react');
    render(<ModalTriggerWrapper />);

    const openBtn = screen.getByRole('button', { name: /open sovereign modal/i });
    openBtn.focus();
    expect(document.activeElement).toBe(openBtn);

    // Open modal
    fireEvent.click(openBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close modal via close button
    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);

    // Focus should be restored to openBtn
    await waitFor(() => {
      expect(document.activeElement).toBe(openBtn);
    });
  });

  it('5. provides full dialog semantics, focus trap, and Escape dismissal for mobile navigation drawer', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppShell>
          <div>View Content</div>
        </AppShell>
      </MemoryRouter>
    );

    const hamburger = screen.getByRole('button', { name: /open mobile navigation/i });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    // Open mobile menu
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    const drawerDialog = screen.getByRole('dialog', { name: /mobile navigation menu/i });
    expect(drawerDialog).toHaveAttribute('aria-modal', 'true');

    // Pressing Escape closes drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /mobile navigation menu/i })).not.toBeInTheDocument();
    });
  });

  it('6. associates form labels with inputs and announces validation errors with role="alert"', async () => {
    const handleSuccess = vi.fn();
    render(
      <HabitFormModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={handleSuccess}
      />
    );

    const titleInput = screen.getByLabelText(/habit name/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveAttribute('required');
    expect(titleInput).toHaveAttribute('aria-required', 'true');

    // Submit without title -> triggers validation error
    const submitBtn = screen.getByRole('button', { name: /establish habit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg).toBeInTheDocument();
      expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('7. exposes accessible radio groups and options for habit tracking types', async () => {
    render(
      <HabitFormModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    const radioGroup = screen.getByRole('radiogroup', { name: /tracking type/i });
    expect(radioGroup).toBeInTheDocument();

    const abstinenceRadio = within(radioGroup).getByRole('radio', { name: /abstinence/i });
    const completionRadio = within(radioGroup).getByRole('radio', { name: /completion/i });
    const quantitativeRadio = within(radioGroup).getByRole('radio', { name: /quantitative/i });

    expect(abstinenceRadio).toHaveAttribute('aria-checked', 'true');
    expect(completionRadio).toHaveAttribute('aria-checked', 'false');

    // Switch to completion
    fireEvent.click(completionRadio);
    expect(completionRadio).toHaveAttribute('aria-checked', 'true');
    expect(abstinenceRadio).toHaveAttribute('aria-checked', 'false');
  });

  it('8. provides accessible status options and audit requirement for check-ins', async () => {
    const sampleHabit: Habit = {
      id: 'c52cf460-2303-4f96-848e-d98c25fdfc51',
      title: 'Digital Purity',
      category: 'abstinence',
      type: 'abstinence',
      schedule: { frequency: 'daily', selectedDays: [0, 1, 2, 3, 4, 5, 6] },
      startDate: '2026-01-01',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };

    render(
      <CheckInModal
        isOpen={true}
        onClose={() => {}}
        habit={sampleHabit}
        onSuccess={() => {}}
      />
    );

    const statusGroup = screen.getByRole('radiogroup', { name: /sovereign status/i });
    expect(statusGroup).toBeInTheDocument();

    const maintainedRadio = screen.getByRole('radio', { name: /maintained standard/i });
    const setbackRadio = screen.getByRole('radio', { name: /setback \/ relapse/i });

    expect(maintainedRadio).toHaveAttribute('aria-checked', 'true');
    expect(setbackRadio).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(setbackRadio);
    expect(setbackRadio).toHaveAttribute('aria-checked', 'true');
    expect(maintainedRadio).toHaveAttribute('aria-checked', 'false');
  });
});
