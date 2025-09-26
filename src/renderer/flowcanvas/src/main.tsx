import React from 'react';
import ReactDOM from 'react-dom/client';
import { FlowCanvasApp } from './App';
import { ErrorBoundary } from '../../common/components/ErrorBoundary';
console.log('FlowCanvas main.tsx loaded');
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <FlowCanvasApp />
      </ErrorBoundary>
    </React.StrictMode>
  );
}