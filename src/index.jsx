import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // ✅ fix here
import { BrowserRouter, HashRouter } from 'react-router-dom';

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container); // ✅ fix here

// Use HashRouter for guaranteed compatibility with static hosting
const Router = HashRouter;

root.render(
    <React.StrictMode>
    {/* <Router basename="/ISA-PHM-Wizard"> */}
    <Router>
        <App />
    </Router>
    </React.StrictMode>
);