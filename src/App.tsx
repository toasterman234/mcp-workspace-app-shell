import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { HostProvider } from './hosts/HostProvider'
import { AppShell } from './shell/AppShell'
import { OverviewPage } from './pages/OverviewPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { BacktestsPage } from './pages/BacktestsPage'
import { ScannersPage } from './pages/ScannersPage'
import { ResearchPage } from './pages/ResearchPage'
import { JobsPage } from './pages/JobsPage'
import { SettingsPage } from './pages/SettingsPage'
import { CatalogPage } from './pages/CatalogPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <HostProvider>
        <AppShell />
      </HostProvider>
    ),
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'portfolio', element: <PortfolioPage /> },
      { path: 'backtests', element: <BacktestsPage /> },
      { path: 'scanners', element: <ScannersPage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
