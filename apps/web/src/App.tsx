import { Routes, Route } from 'react-router-dom'

function Navbar() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <span className="font-semibold text-lg">StubLab</span>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<div>Lista de endpoints (em breve)</div>} />
          <Route path="/endpoints/new" element={<div>Novo endpoint (em breve)</div>} />
          <Route path="/endpoints/:id/edit" element={<div>Editar endpoint (em breve)</div>} />
        </Routes>
      </main>
    </div>
  )
}
