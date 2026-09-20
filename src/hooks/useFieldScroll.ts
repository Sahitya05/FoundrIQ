import Lenis from 'lenis'
import { useEffect } from 'react'
import { useVenture } from '../store/venture'

export function useFieldScroll() {
  const phase = useVenture((s) => s.phase)
  const setScroll = useVenture((s) => s.setScroll)
  const setReportScroll = useVenture((s) => s.setReportScroll)

  useEffect(() => {
    if (phase !== 'landing' && phase !== 'report') {
      window.scrollTo(0, 0)
      return
    }

    const lenis = new Lenis({
      duration: 1.15,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    const onScroll = () => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const p = Math.min(Math.max(window.scrollY / max, 0), 1)
      if (phase === 'landing') setScroll(p)
      if (phase === 'report') setReportScroll(p)
    }

    lenis.on('scroll', onScroll)
    onScroll()

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [phase, setScroll, setReportScroll])
}
