// src/pages/StudyPage.js
import React, { useEffect, forwardRef, useState } from 'react';
// import { Switch } from '../ui/switch';

// // Import the single global provider
// import { GlobalDataProvider, useGlobalDataContext } from '../../contexts/GlobalDataContext';

// import useStudies from '../../hooks/useStudies';
// import Collection, {
//     CollectionTitle,
//     CollectionSubtitle,
//     CollectionAddButtonText,
//     CollectionEmptyStateTitle,
//     CollectionEmptyStateSubtitle,
//     CollectionEmptyStateAddButtonText
// } from '../Collection';

// import useResizeObserver from '../../hooks/useResizeObserver';
// import useCombinedRefs from '../../hooks/useCombinedRefs';
// import { usePageTab } from '../../hooks/usePageWidth'; // Import the usePageTab hook

// import studySlideContent from '../../data/studySlideContent.json'; // Assuming you have a JSON file for the content
// import { SlidePageTitle } from '../Typography/Heading2';
// import { SlidePageSubtitle } from '../Typography/Paragraph';
// import TabSwitcher, { TabPanel } from '../TabSwitcher';
// import useCarouselNavigation from '../../hooks/useCarouselNavigation';
import DataGrid from '../DataGrid'; // Import the new DataGrid
import { BoldCell, HTML5DateCellTemplate, PatternCellTemplate } from '../GridTable/CellTemplates'; // Import cell templates
import { Template } from '@revolist/react-datagrid';

// Move static configuration OUTSIDE the component to prevent recreation
const STATIC_COLUMNS = [
  {
    prop: 'id',
    name: 'Identifier',
    size: 150,
    readonly: true,
    cellTemplate: Template(PatternCellTemplate, { prefix: 'Study S' }),
    cellProperties: () => {
      return {
        style: {
          "border-right": "3px solid "
        }
      }
    }
  },
  {
    prop: 'name',
    name: 'Study Name',
    size: 200,
    readonly: false
  },
  {
    prop: 'description',
    name: 'Description',
    size: 300,
    readonly: false
  },
  {
    prop: 'submissionDate',
    name: 'Submission Date',
    size: 250,
    readonly: false,
    cellTemplate: Template(HTML5DateCellTemplate),
  },
  {
    prop: 'publicationDate',
    name: 'Publication Date',
    size: 250,
    readonly: false,
    cellTemplate: Template(HTML5DateCellTemplate),
  }
];

const initial_studies = [
  {
    "id": "f8221ee1-66fe-4e4e-ad6e-a7833e92f317",
    "name": "Test Study 1",
    "description": "Description of test study 1",
    "submissionDate": "2025-09-03",
    "publicationDate": "2025-10-10"
  },
  {
    "id": "131179fe-1943-49ce-ad74-e719199fdd2d",
    "name": "Test study 2",
    "description": "Description of test study 2",
    "submissionDate": "2025-09-02",
    "publicationDate": "2025-10-02"
  },
  {
    "id": "83b49697-6f2d-49fd-a43e-3795341e21e4",
    "name": "Test study 3",
    "description": "Description of test study 3",
    "submissionDate": "2025-09-12",
    "publicationDate": "2025-10-08"
  },
  {
    "id": "6e56c52d-d0bc-403f-a14c-a5af663c3852",
    "name": "Test study 4",
    "description": "Description of test study 4",
    "submissionDate": "2025-09-12",
    "publicationDate": "2025-09-02"
  }
]

export const StudySlide = () => {

    // Use persistent tab state that remembers across page navigation
    // const [selectedTab, setSelectedTab] = usePageTab(5, 'simple-view'); // Page 5 for StudySlide

    // const elementToObserveRef = useResizeObserver(onHeightChange);
    // const combinedRef = useCombinedRefs(ref, elementToObserveRef);
  const [studies, setStudies] = useState(initial_studies);
    // const { setScreenWidth, studies, setStudies } = useGlobalDataContext();

    console.log('🔴 StudySlide render, studies state:', studies);

    // useEffect(() => {
    //     if (selectedTab === 'grid-view' && currentPage === 5) {
    //         setScreenWidth("max-w-[100rem]");
    //     } else if (currentPage === 5) {
    //         setScreenWidth("max-w-5xl");
    //     }
    // }, [selectedTab, currentPage, setScreenWidth]);

    // Helper function to generate unique IDs
    const generateId = () => {
        return crypto.randomUUID();
    };

    // Add new study function
    const addNewStudy = () => {
        const newStudy = {
            id: generateId(),
            name: `New Study ${studies.length + 1}`,
            description: 'Enter description...',
            submissionDate: "",
            publicationDate: ""
        };
        setStudies([...studies, newStudy]);
    };

    // Remove last study function
    const removeLastStudy = () => {
        if (studies.length > 0) {
            setStudies(studies.slice(0, -1));
        }
    };

    // Handle study data changes from the grid
    const handleStudyDataChange = (newStudyData) => {
        console.log('🔴 StudySlide handleStudyDataChange called with:', newStudyData);
        setStudies(newStudyData);
    };

    // Grid configuration for studies
    const studiesGridConfig = {
        title: 'Studies Data',
        rowData: studies,
        columnData: [], // No dynamic columns for standalone grid
        mappings: [], // No mappings for standalone grid
        staticColumns: STATIC_COLUMNS // Use the static reference
    };
    
    console.log('🔴 StudySlide studiesGridConfig created, staticColumns reference:', STATIC_COLUMNS === studiesGridConfig.staticColumns);
    
    return (
        <DataGrid
            key="studies-grid" // Stable key to prevent remounting
            title="Studies Data"
            rowData={studies}
            columnData={[]} // No dynamic columns
            mappings={[]} // No mappings
            staticColumns={STATIC_COLUMNS}
            height="500px"
            onRowDataChange={handleStudyDataChange}
        />
        // <div ref={combinedRef}>

        //     <SlidePageTitle>
        //         {studySlideContent.pageTitle}
        //     </SlidePageTitle>

        //     <SlidePageSubtitle>
        //         {studySlideContent.pageSubtitle}
        //     </SlidePageSubtitle>

        //     <div className='bg-gray-50 p-3 border-gray-300 border rounded-lg pb-2 relative'>
        //        <TabSwitcher
        //             selectedTab={selectedTab}
        //             onTabChange={setSelectedTab}
        //             tabs={[
        //                 { id: 'simple-view', label: 'Simple View', tooltip: 'View studies in a simple list format' },
        //                 { id: 'grid-view', label: 'Grid View', tooltip: 'View studies in a grid format for better data management' }
        //             ]}
        //         />

        //         {/* <TabPanel isActive={selectedTab === 'simple-view'}>
        //             <Collection
        //                 onHeightChange={() => { }}
        //                 itemHook={useStudies} // This hook will need to pull 'studies' from the global context
        //                 grid={true}
        //             >
        //                 <CollectionTitle>Studies</CollectionTitle>
        //                 <CollectionSubtitle>View, add and edit Studies</CollectionSubtitle>
        //                 <CollectionAddButtonText>Add Study</CollectionAddButtonText>
        //                 <CollectionEmptyStateTitle>No Studies Found</CollectionEmptyStateTitle>
        //                 <CollectionEmptyStateSubtitle>Click below to add your first Study</CollectionEmptyStateSubtitle>
        //                 <CollectionEmptyStateAddButtonText>Add Study Now</CollectionEmptyStateAddButtonText>
        //             </Collection>
        //         </TabPanel>

        //         <TabPanel isActive={selectedTab === 'grid-view'}> */}
        //             <DataGrid
        //                 {...studiesGridConfig}
        //                 showControls={true}
        //                 showDebug={false}
        //                 onRowDataChange={handleStudyDataChange}
        //                 height="500px"
        //             />
        //         {/* </TabPanel> */}
        //     </div>
        // </div>
    );
};

StudySlide.displayName = "Studies"; // Set display name for better debugging

export default StudySlide;