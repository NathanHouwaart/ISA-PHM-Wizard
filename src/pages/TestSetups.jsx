import "../styles.css";

// Hooks
import useDynamicHeightContainer from '../hooks/useDynamicHeightContainer';

import Collection, {
  CollectionTitle,
  CollectionUndertitle,
  CollectionAddButtonText,
  CollectionEmptyStateTitle,
  CollectionEmptyStateUndertitle,
  CollectionEmptyStateAddButtonText
} from '../components/Collection'; // Adjust the import path as needed
import useTestSetups from '../hooks/useTestSetups';
import PageWrapper from '../layout/PageWrapper';
import Heading1 from '../components/Typography/Heading1';
import Paragraph from '../components/Typography/Paragraph';

import initialTestSetups from '../data/InitialTestSetups.json'

export const TestSetups = () => {

  const {
    containerHeight,
    childRefs,
    handleChildHeightChange,
  } = useDynamicHeightContainer();

  return (
    <PageWrapper>
      <div className='space-y-6 w-full overflow-hidden flex-shrink-0' >
        <div style={{ height: containerHeight, transition: 'height 0.35s' }}>
          {
            <Collection
              ref={el => childRefs.current[0] = el}
              onHeightChange={handleChildHeightChange}
              itemHook={useTestSetups}
              initialItems={initialTestSetups}
            >
              <CollectionTitle>Test Setups</CollectionTitle>
              <CollectionUndertitle>View, add and edit test-setups to be used in ISA-PHM</CollectionUndertitle>
              <CollectionAddButtonText>Add Test Setup</CollectionAddButtonText>
              <CollectionEmptyStateTitle>No Test Setups Found</CollectionEmptyStateTitle>
              <CollectionEmptyStateUndertitle>Click below to add your first test setup</CollectionEmptyStateUndertitle>
              <CollectionEmptyStateAddButtonText>Add test setup Now</CollectionEmptyStateAddButtonText>
            </Collection>
          }
        </div>
      </div>
    </PageWrapper>
  );
};