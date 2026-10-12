import { useEffect, useState, type ReactNode } from 'react'
import { photoUrl } from '../lib/store'

/** Foto que se revela como papel fotográfico enquanto o servidor responde. */
export function Photo({ value, alt, className = '', fallback = null }: { value?: string; alt: string; className?: string; fallback?: ReactNode }) {
  const [url, setUrl] = useState<string>()
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    setLoaded(false); setUrl(undefined)
    void photoUrl(value).then(next => { if (alive) setUrl(next) })
    return () => { alive = false }
  }, [value])
  if (!value) return <>{fallback}</>
  return <span className={`photo ${loaded ? 'is-developed' : 'is-developing'} ${className}`}>
    {url && <img src={url} alt={alt} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)}/>}
  </span>
}
