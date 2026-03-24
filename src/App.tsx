import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const GanttEarth = lazy(() => import('./designs/gantt-2/GanttEarth'))

function Loading() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F5F7',
        color: '#5E6C84',
        fontSize: 14,
        letterSpacing: '0.02em',
      }}
    >
      Loading...
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="*" element={<GanttEarth />} />
      </Routes>
    </Suspense>
  )
}
