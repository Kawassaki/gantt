import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const Home = lazy(() => import('./Home'))
const GanttNoir = lazy(() => import('./designs/gantt-1/GanttNoir'))
const GanttEarth = lazy(() => import('./designs/gantt-2/GanttEarth'))
const GanttNeon = lazy(() => import('./designs/gantt-3/GanttNeon'))
const GanttSwiss = lazy(() => import('./designs/gantt-4/GanttSwiss'))
const GanttGlass = lazy(() => import('./designs/gantt-6/GanttGlass'))

function Loading() {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0c0a1a',
        color: 'rgba(255,255,255,0.4)',
        fontFamily: "'Sora', sans-serif",
        fontSize: 14,
        letterSpacing: '0.06em',
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
        <Route path="/" element={<Home />} />
        <Route path="/gantt-1" element={<GanttNoir />} />
        <Route path="/gantt-2" element={<GanttEarth />} />
        <Route path="/gantt-3" element={<GanttNeon />} />
        <Route path="/gantt-4" element={<GanttSwiss />} />
        <Route path="/gantt-6" element={<GanttGlass />} />
      </Routes>
    </Suspense>
  )
}
