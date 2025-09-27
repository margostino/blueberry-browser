import React from 'react'
import ReactDOM from 'react-dom/client'
import { SidebarApp } from './SidebarApp'
import { ErrorBoundary } from '@common/components/ErrorBoundary'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <SidebarApp />
        </ErrorBoundary>
    </React.StrictMode>
)
