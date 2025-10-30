import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import AlertDecisionDialog from './AlertDecisionDialog';

if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

describe('AlertDecisionDialog', () => {
    const defaultProps = {
        open: true,
        title: 'Dialog title',
        message: 'Dialog message body',
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    };

    beforeEach(() => {
        defaultProps.onConfirm.mockClear();
        defaultProps.onCancel.mockClear();
    });

    it('does not render when closed', () => {
        render(
            <AlertDecisionDialog
                {...defaultProps}
                open={false}
            />
        );
        expect(screen.queryByText('Dialog title')).not.toBeInTheDocument();
    });

    it('renders title and message when open', () => {
        render(
            <AlertDecisionDialog
                {...defaultProps}
            />
        );
        expect(screen.getByRole('heading', { name: 'Dialog title' })).toBeInTheDocument();
        expect(screen.getByText('Dialog message body')).toBeInTheDocument();
    });

    it('fires confirm and cancel callbacks', () => {
        render(
            <AlertDecisionDialog
                {...defaultProps}
                confirmLabel="Proceed"
                cancelLabel="Dismiss"
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not steal focus when opened', () => {
        render(
            <div>
                <button type="button" autoFocus>Before</button>
                <AlertDecisionDialog
                    {...defaultProps}
                    confirmLabel="OK"
                />
            </div>
        );

        expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
        expect(screen.getByRole('button', { name: 'OK' })).not.toHaveFocus();
    });

    it('handles keyboard shortcuts for cancel (Escape) and confirm (Enter)', () => {
        render(
            <AlertDecisionDialog
                {...defaultProps}
            />
        );

        fireEvent.keyDown(document, { key: 'Enter' });
        expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
});
