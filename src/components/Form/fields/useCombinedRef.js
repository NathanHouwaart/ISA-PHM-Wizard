import { useRef, useCallback } from 'react';

const useCombinedRef = (externalRef) => {
    const internalRef = useRef(null);

    const assignRef = useCallback(
        (node) => {
            internalRef.current = node;
            if (typeof externalRef === 'function') {
                externalRef(node);
            } else if (externalRef && typeof externalRef === 'object') {
                // eslint-disable-next-line no-param-reassign
                externalRef.current = node;
            }
        },
        [externalRef]
    );

    return [internalRef, assignRef];
};

export default useCombinedRef;
