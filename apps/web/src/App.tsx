import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<div className="p-8"><h1 className="text-2xl font-bold">StubLab</h1><p className="text-muted-foreground mt-2">Mock server com interface web</p></div>} />
      </Routes>
    </div>
  )
}
