
import React from "react";
import ReactDOM from "react-dom/client";

import Navbar from "./components/Navbar";
import { Routes } from "react-router-dom";
import { Route } from "react-router-dom";
import { QuestionnaireFormProvider } from "./contexts/QuestionnaireFormContext";


import { About, Contact, Home, TestSetups} from "./pages";

function App() {
  return (
    <div className="App">
      <Navbar />
      <QuestionnaireFormProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<TestSetups />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
      </QuestionnaireFormProvider>
    </div>
  );
}

export default App;
