import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { initializeNative, isNative } from './utils/native';
import { notificationService } from './services/notificationService';

// Initialize native features when running on iOS/Android
if (isNative) {
  initializeNative();
}

// Initialize notification service (for delivery reminders)
notificationService.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
