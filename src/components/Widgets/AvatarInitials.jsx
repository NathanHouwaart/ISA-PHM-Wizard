import React, { useMemo } from 'react';

import { cn } from '../../utils/utils';
import { AVATAR_SIZE_CLASSES } from '../../constants/ui';

/**
 * AvatarInitials Component
 * 
 * Displays user/entity initials in a circular avatar with gradient background.
 * Extracts up to 2 initials from the first two words of the provided name.
 * 
 * @component
 * @example
 * // Basic usage with default styling
 * <AvatarInitials name="John Doe" />
 * 
 * @example
 * // Custom size and gradient
 * <AvatarInitials 
 *   name="Jane Smith" 
 *   size="lg"
 *   gradientFrom="from-blue-500"
 *   gradientTo="to-purple-600"
 * />
 * 
 * @param {Object} props - Component props
 * @param {string} props.name - The name to extract initials from (required)
 * @param {string} [props.className=''] - Additional CSS classes to apply
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Size variant (sm: 12x12, md: 16x16, lg: 20x20)
 * @param {string} [props.gradientFrom='from-green-500'] - Tailwind gradient start color class
 * @param {string} [props.gradientTo='to-teal-600'] - Tailwind gradient end color class
 * @returns {JSX.Element} Circular avatar with initials
 */
const AvatarInitials = ({ 
  name, 
  className = '', 
  size = 'md',
  gradientFrom = 'from-green-500',
  gradientTo = 'to-teal-600'
}) => {
  const initials = useMemo(() => {
    if (!name || typeof name !== 'string') return '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }, [name]);

  return (
    <div 
      className={cn(
        'bg-gradient-to-br rounded-full flex flex-none items-center justify-center text-white font-bold',
        gradientFrom,
        gradientTo,
        AVATAR_SIZE_CLASSES[size],
        className
      )}
      role="img"
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
};

export default AvatarInitials;
