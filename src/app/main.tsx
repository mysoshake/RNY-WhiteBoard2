// ./src/app/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../style.css';

// index.html の <div id="app"></div> にマウント
ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);