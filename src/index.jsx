import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // ✅ fix here
import { BrowserRouter } from 'react-router-dom';

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container); // ✅ fix here

root.render(
    <React.StrictMode>
    <BrowserRouter>
        <App />
    </BrowserRouter>
    </React.StrictMode>
);