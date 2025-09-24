import { useGlobalDataContext } from '../contexts/GlobalDataContext';

/**
 * Simple hook to manage tab state for a specific page
 * @param {number} pageNumber - The page number this slide represents
 * @param {string} defaultTab - The default tab when first visiting this page
 */
export const usePageTab = (pageNumber, defaultTab = 'simple-view') => {
    const { pageTabStates, setPageTabStates } = useGlobalDataContext();
    
    // Get the current tab for this page, or use default
    const selectedTab = pageTabStates[pageNumber] || defaultTab;
    
    // Function to update tab for this page
    const setSelectedTab = (tab) => {
        setPageTabStates(prev => ({
            ...prev,
            [pageNumber]: tab
        }));
    };
    
    return [selectedTab, setSelectedTab];
};

export default usePageTab;
