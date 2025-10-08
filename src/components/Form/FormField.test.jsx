import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import FormField from './FormField';

describe('FormField', () => {
    test('renders label and explanation button when explanation provided', () => {
        const { container } = render(
            <FormField
                name="title"
                label="Title"
                value="Example"
                onChange={() => {}}
                explanation="Helpful hint"
                example="Example title"
            />
        );

        expect(screen.getByText('Title')).toBeInTheDocument();
        const helpButton = container.querySelector('button');
        expect(helpButton).toBeInTheDocument();
        expect(helpButton).toHaveAttribute('type', 'button');
    });

    test('commits buffered value on blur when commitOnBlur is true', () => {
        const handleChange = vi.fn();

        render(
            <FormField
                name="title"
                label="Title"
                value="Initial"
                onChange={handleChange}
                commitOnBlur
            />
        );

        const input = screen.getByRole('textbox');

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'Updated Title' } });
        expect(handleChange).not.toHaveBeenCalled();

        fireEvent.blur(input);

        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange.mock.calls[0][0].target.value).toBe('Updated Title');
    });

    test('adds new tag when pressing enter in tags field', () => {
        const handleAddTag = vi.fn();
        const handleRemoveTag = vi.fn();

        render(
            <FormField
                type="tags"
                name="keywords"
                value={[]}
                tags={['Alpha', 'Beta']}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
            />
        );

        const input = screen.getByRole('textbox');

        fireEvent.change(input, { target: { value: 'Gamma' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        expect(handleAddTag).toHaveBeenCalledWith('Gamma');
        expect(handleRemoveTag).not.toHaveBeenCalled();
    });
});
