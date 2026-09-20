import { useEffect } from 'react'
import { Experience } from './experience/Experience'
import { useFieldScroll } from './hooks/useFieldScroll'
import { useVenture } from './store/venture'
import { Boot } from './ui/Boot'
import { Grain, Nav } from './ui/Chrome'
import { Landing } from './ui/Landing'
import { Briefing } from './ui/Briefing'
import { Investigation } from './ui/Investigation'
import { Report } from './ui/Report'

export default function App() {
  const phase = useVenture((s) => s.phase)
  const setPointer = useVenture((s) => s.setPointer)
  useFieldScroll()

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = -(event.clientY / window.innerHeight) * 2 + 1
      setPointer(x, y)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [setPointer])

  useEffect(() => {
    const lock = phase === 'boot'
    document.body.style.overflow = lock ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [phase])

  return (
    <>
      <Experience />
      <Grain />
      <Nav />
      {phase === 'boot' && <Boot />}
      {phase === 'landing' && <Landing />}
      {phase === 'briefing' && <Briefing />}
      {phase === 'investigation' && <Investigation />}
      {phase === 'report' && <Report />}
    </>
  )
}
