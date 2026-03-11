import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import TooltipButton from './TooltipButton';
import { cn } from '../../utils/utils';

/**
 * AlertDecisionDialog
 *
 * Design brief:
 * Renders an accessible confirmation/dialog component that replaces native `alert()` usages.
 * Uses existing typography (Heading3/Paragraph) and TooltipButton actions to match project styling.
 * Intended for short blocking messages with optional confirmation/cancellation callbacks.
 *
 * API (props):
 * - open: boolean flag to mount/unmount the dialog.
 * - title: string heading shown via Heading3.
 * - message: React node describing the alert content (Paragraph-wrapped by default).
 * - tone: 'info' | 'success' | 'warning' | 'danger' to adjust icon/accent.
 * - confirmLabel / cancelLabel: button text overrides (defaults to 'OK' / 'Cancel').
 * - confirmTooltip / cancelTooltip: tooltip copy for respective buttons.
 * - onConfirm: callback invoked when the primary action is clicked (required).
 * - onCancel: callback for dismissal (required when a cancel control is shown).
 * - showCancel: optionally hide the cancel action (defaults to true to provide OK/Cancel affordances).
 * - className: optional Tailwind utility overrides for the surface container.
 * - icon: optional React node to replace default tone icon.
 * - children: optional React node to render custom dialog body (falls back to `message`).
 *
 * Accessibility notes:
 * - Uses `role="alertdialog"` with labelled-by and described-by IDs for screen readers.
 * - Focus is moved to the confirm button on open and restored to the previous element on close.
 * - Escape key triggers cancellation; Enter triggers confirmation for quick keyboard interaction.
 *
 * Examples:
 * ```
 * <AlertDecisionDialog
 *   open={showError}
 *   tone="danger"
 *   title="Export failed"
 *   message="We could not export the project package. Try again after checking your connection."
 *   onConfirm={() => setShowError(false)}
 *   onCancel={() => setShowError(false)}
 * />
 *
 * <AlertDecisionDialog
 *   open={showReset}
 *   tone="warning"
 *   title="Reset default project?"
 *   message="This action overwrites the default project with seed data."
 *   confirmLabel="Reset project"
 *   cancelLabel="Keep current"
 *   onConfirm={handleReset}
 *   onCancel={() => setShowReset(false)}
 * />
 * ```
 *
 * Migration notes:
 * - Wrap any `alert()` call by storing dialog state in the parent (title/message/callbacks).
 * - Adopt incrementally; component is standalone and can coexist with existing modal implementations.
 */
const toneConfig = {
    info: {
        icon: Info,
        accentClass: 'bg-blue-50 border-blue-100 text-blue-700',
    },
    success: {
        icon: CheckCircle2,
        accentClass: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    },
    warning: {
        icon: AlertTriangle,
        accentClass: 'bg-amber-50 border-amber-100 text-amber-700',
    },
    danger: {
        icon: XCircle,
        accentClass: 'bg-rose-50 border-rose-100 text-rose-700',
    },
};

const AlertDecisionDialog = ({
    open,
    title,
    message,
    tone = 'info',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    confirmTooltip,
    cancelTooltip,
    onConfirm,
    onCancel,
    tertiaryLabel,
    tertiaryTooltip,
    onTertiary,
    showCancel = true,
    className,
    icon,
    children,
    confirmButtonProps = {},
    cancelButtonProps = {},
    tertiaryButtonProps = {},
    overlayClassName,
    contentClassName,
    ...surfaceProps
}) => {
    const previouslyFocusedRef = useRef(null);
    const bodyLockStateRef = useRef({
        overflow: '',
        paddingRight: '',
    });

    const toneMeta = useMemo(() => toneConfig[tone] || toneConfig.info, [tone]);
    const ariaTitleId = 'alert-decision-dialog-title';
    const ariaDescriptionId = 'alert-decision-dialog-description';

    useEffect(() => {
        if (!open || typeof document === 'undefined' || typeof window === 'undefined') {
            return undefined;
        }

        previouslyFocusedRef.current = document.activeElement;

        const body = document.body;
        const docEl = document.documentElement;

        bodyLockStateRef.current = {
            overflow: body.style.overflow,
            paddingRight: body.style.paddingRight,
        };

        const scrollbarWidth = window.innerWidth - docEl.clientWidth;
        const computedPadding = parseFloat(window.getComputedStyle(body).paddingRight || '0');
        const basePadding = Number.isFinite(computedPadding) ? computedPadding : 0;

        body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            body.style.paddingRight = `${basePadding + scrollbarWidth}px`;
        }

        return () => {
            body.style.overflow = bodyLockStateRef.current.overflow;
            body.style.paddingRight = bodyLockStateRef.current.paddingRight;
            if (previouslyFocusedRef.current && previouslyFocusedRef.current.focus) {
                previouslyFocusedRef.current.focus();
            }
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel?.();
            }
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onConfirm?.();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel, onConfirm]);

    if (!open) return null;

    const ToneIcon = icon || toneMeta.icon;
    const portalTarget = typeof document !== 'undefined' ? document.body : null;
    if (!portalTarget) return null;

    const renderBody = () => {
        if (children) return children;
        if (typeof message === 'string') {
            return (
                <Paragraph id={ariaDescriptionId} className="text-gray-600 mt-3">
                    {message}
                </Paragraph>
            );
        }
        return (
            <div id={ariaDescriptionId} className="mt-3">
                {message}
            </div>
        );
    };

    const { className: confirmClassName, ...restConfirmButtonProps } = confirmButtonProps;
    const { className: cancelClassName, ...restCancelButtonProps } = cancelButtonProps;
    const { className: tertiaryClassName, ...restTertiaryButtonProps } = tertiaryButtonProps;

    return createPortal(
        <div
            className={cn('fixed inset-0 z-[75] flex items-center justify-center', overlayClassName)}
            role="presentation"
        >
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                aria-hidden="true"
                onClick={() => onCancel?.()}
            />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={ariaTitleId}
                aria-describedby={ariaDescriptionId}
                className={cn(
                    'relative z-[76] w-full max-w-lg mx-4 rounded-2xl border border-gray-200 bg-white shadow-2xl p-6',
                    className
                )}
                {...surfaceProps}
            >
                <div
                    className={cn(
                        'flex items-start gap-4 rounded-xl border px-4 py-3',
                        toneMeta.accentClass,
                        contentClassName
                    )}
                >
                    <div className="flex-shrink-0 mt-1">
                        <ToneIcon className="w-6 h-6" aria-hidden />
                    </div>
                    <div className="flex-1">
                        <Heading3 id={ariaTitleId} className="text-[1.15rem] text-gray-900">
                            {title}
                        </Heading3>
                        {renderBody()}
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            {showCancel && (
                                <TooltipButton
                                    onClick={() => onCancel?.()}
                                    tooltipText={cancelTooltip || cancelLabel}
                                    className={cn(
                                        'bg-gray-100 text-gray-700 hover:bg-gray-200',
                                        cancelClassName
                                    )}
                                    {...restCancelButtonProps}
                                >
                                    {cancelLabel}
                                </TooltipButton>
                            )}
                            {tertiaryLabel && typeof onTertiary === 'function' && (
                                <TooltipButton
                                    onClick={() => onTertiary?.()}
                                    tooltipText={tertiaryTooltip || tertiaryLabel}
                                    className={cn(
                                        'bg-gray-100 text-gray-700 hover:bg-gray-200',
                                        tertiaryClassName
                                    )}
                                    {...restTertiaryButtonProps}
                                >
                                    {tertiaryLabel}
                                </TooltipButton>
                            )}
                            <TooltipButton
                                onClick={() => onConfirm?.()}
                                tooltipText={confirmTooltip || confirmLabel}
                                className={cn(
                                    'bg-gradient-to-r from-blue-500 to-blue-600',
                                    confirmClassName
                                )}
                                {...restConfirmButtonProps}
                            >
                                {confirmLabel}
                            </TooltipButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        portalTarget
    );
};

export default AlertDecisionDialog;
