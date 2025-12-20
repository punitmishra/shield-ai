import { Shield } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-16 h-16 text-primary-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shield AI</h1>
        <p className="text-gray-600">AI-Powered DNS Protection Dashboard</p>
      </div>
    </div>
  )
}

export default App
