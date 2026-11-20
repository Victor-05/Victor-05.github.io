import { lazy, Suspense, useState } from 'react'
import ReferenceCase from '../components/ReferenceCase.jsx'
import StoryStatic from '../components/story/StoryStatic.jsx'
import EntryLinks from '../components/story/EntryLinks.jsx'
import { detect3D } from '../lib/capabilities.js'

// three.js + GSAP live only in this lazily loaded chunk.
const Story3D = lazy(() => import('../three/Story3D.jsx'))

export default function Landing() {
  const [caps, setCaps] = useState(() => detect3D())
  const force3D = () => {
    try { localStorage.setItem('force3d', '1') } catch { /* ignore */ }
    setCaps(detect3D())
  }
  return (
    <>
      {caps.use3D ? (
        <Suspense fallback={<div className="h-svh" aria-busy="true" />}>
          <Story3D lowDetail={caps.mobile || caps.forced} interactive={!caps.mobile} />
        </Suspense>
      ) : (
        <StoryStatic onForce3D={caps.webgl && !caps.reduced && caps.lowEnd ? force3D : null} />
      )}
      <ReferenceCase />
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-5 font-display text-2xl font-bold text-white sm:text-3xl">Alegeți punctul de plecare</h2>
          <EntryLinks />
        </div>
      </section>
    </>
  )
}
