import { Routes, Route } from 'react-router-dom'
import { EndpointsList } from '@web/pages/endpoints-list'
import { EndpointNew } from '@web/pages/endpoint-new'
import { EndpointEdit } from '@web/pages/endpoint-edit'

function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center">
        <span className="font-semibold text-lg">StubLab</span>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<EndpointsList />} />
          <Route path="/endpoints/new" element={<EndpointNew />} />
          <Route path="/endpoints/:id/edit" element={<EndpointEdit />} />
        </Routes>
      </main>
    </div>
  )
}
