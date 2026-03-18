import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SuggestionStrip from './SuggestionStrip';

describe('SuggestionStrip', () => {
    it('renders suggestion labels', () => {
        render(
            <SuggestionStrip
                suggestions={[
                    { name: 'Sensor Location', unit: '' },
                    { name: 'Sampling Rate', unit: 'Hz' }
                ]}
            />
        );

        expect(screen.getByText('+ Sensor Location')).toBeInTheDocument();
        expect(screen.getByText('+ Sampling Rate (Hz)')).toBeInTheDocument();
    });

    it('calls onSelect with suggestion when clicked', () => {
        const onSelect = vi.fn();
        const suggestion = { name: 'Filter type', unit: '', description: 'Processing filter' };

        render(
            <SuggestionStrip
                suggestions={[suggestion]}
                onSelect={onSelect}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '+ Filter type' }));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(suggestion);
    });
});
