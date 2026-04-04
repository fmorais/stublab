import { Routes, Route, Navigate } from 'react-router-dom'
import { WorkspaceList } from '@web/pages/workspace-list'
import { EndpointsList } from '@web/pages/endpoints-list'
import { EndpointCreate } from '@web/pages/endpoint-create'
import { EndpointEdit } from '@web/pages/endpoint-edit'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-input px-6 py-4">
        <span className="text-base font-bold tracking-tight">StubLab</span>
      </header>
      <main className="px-6 py-6">
        <Routes>
          <Route path="/" element={<WorkspaceList />} />
          <Route path="/workspaces/:slug" element={<Navigate to="endpoints" replace />} />
          <Route path="/workspaces/:slug/endpoints" element={<EndpointsList />} />
          <Route path="/workspaces/:slug/endpoints/new" element={<EndpointCreate />} />
          <Route path="/workspaces/:slug/endpoints/:id/edit" element={<EndpointEdit />} />
        </Routes>
      </main>
    </div>
  )
}
