import React from 'react';
import PageWrapper from '../layout/PageWrapper';
import { Link } from 'react-router-dom';
import HeroImg from '../../assets/house.svg';
import Heading1 from '../components/Typography/Heading1';
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
              <h2 className="text-xl font-semibold">About</h2>
              <p className="text-sm text-gray-600 mt-3">Read about the project and how to use the wizard.</p>
            </Link>

            <Link to="/testsetups" className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-8 border border-gray-200 h-full">
              <h2 className="text-xl font-semibold">Test Setups</h2>
              <p className="text-sm text-gray-600 mt-3">Create or select test setups used in studies and experiments.</p>
            </Link>

            <Link to="/isaquestionnaire" className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition p-8 border border-gray-200 h-full">
              <h2 className="text-xl font-semibold">ISA Questionnaire</h2>
              <p className="text-sm text-gray-600 mt-3">Open the ISA questionnaire form to capture study metadata.</p>
            </Link>
          </div>
        </main>

        <footer className="text-center text-sm text-gray-500 mt-6">
          <p>Use the navigation above or the quick links to get started.</p>
        </footer>
      </div>
    </PageWrapper>
  );
};

export default Home;
