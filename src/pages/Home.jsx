import { Link } from 'react-router-dom';

import PageWrapper from '../layout/PageWrapper';

import Heading1 from '../components/Typography/Heading1';
import Heading2 from '../components/Typography/Heading2';
import Paragraph from '../components/Typography/Paragraph';

export const Home = () => {
  return (
    <PageWrapper widthClass="max-w-7xl">
      <div className="space-y-8">
        <header className=" text-center">
            <div className="py-8">
              <Heading1 className="text-5xl font-extrabold leading-tight">Welcome to the ISA-PHM Wizard</Heading1>
              <Paragraph className="text-gray-600 mt-4 text-lg">A lightweight toolkit to create, map and export study metadata. Choose a tool below to get started quickly.</Paragraph>
            </div>
        </header>

        <main>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-2">
            <Link to="/about" className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-8 border border-gray-200 h-full">
              <Heading2>About</Heading2>
              <Paragraph className="text-sm text-gray-600 mt-3">Read about the project and how to use the wizard.</Paragraph>
            </Link>

            <Link to="/testsetups" className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-8 border border-gray-200 h-full">
              <Heading2>Test Setups</Heading2>
              <Paragraph className="text-sm text-gray-600 mt-3">Create or select test setups used in studies and experiments.</Paragraph>
            </Link>

            <Link to="/isaquestionnaire" className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-8 border border-gray-200 h-full">
              <Heading2>ISA Questionnaire</Heading2>
              <Paragraph className="text-sm text-gray-600 mt-3">Open the ISA questionnaire form to capture study metadata.</Paragraph>
            </Link>
          </div>
        </main>

        <footer className="text-center text-sm text-gray-500 mt-6">
          <Paragraph>Use the navigation above or the quick links to get started.</Paragraph>
        </footer>
      </div>
    </PageWrapper>
  );
};

export default Home;
