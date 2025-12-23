import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'bg-obsidian-800 text-white border border-obsidian-700',
          style: {
            background: '#41414b',
            color: '#fff',
            border: '1px solid #4c4c59',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);

