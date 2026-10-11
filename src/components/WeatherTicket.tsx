import { MapPin } from 'lucide-react'
import type { Moment } from '../lib/moment'
import type { WeatherContext } from '../lib/weather'
import { weatherDescription } from '../lib/weather'
import { CountUp } from './Feedback'

type Sky = 'sun' | 'moon' | 'cloud' | 'rain' | 'storm' | 'fog' | 'reading'
function skyFor(weather: WeatherContext | undefined, night: boolean, loading: boolean): Sky {
  if (loading) return 'reading'
  if (!weather) return night ? 'moon' : 'sun'
  const code = weather.weatherCode
  if (code >= 95) return 'storm'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 2) return 'cloud'
  return night ? 'moon' : 'sun'
}
const cloud = <path className="sky-cloud" d="M13 31h20a6.5 6.5 0 0 0 .4-13 9 9 0 0 0-17.2 2.2A5.4 5.4 0 0 0 13 31Z"/>

/** Ícones do céu em traço de lápis, cada um com seu movimento. */
function SkyGlyph({ sky }: { sky: Sky }) {
  return <svg className={`sky sky-${sky}`} width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true">
    {sky === 'sun' && <><g className="sky-rays">{Array.from({ length: 8 }, (_, i) => <path key={i} d="M23 5v5" transform={`rotate(${i * 45} 23 23)`}/>)}</g><circle className="sky-body" cx="23" cy="23" r="8.5"/></>}
    {sky === 'moon' && <><path className="sky-body" d="M28 8a14 14 0 1 0 9.5 23A11 11 0 0 1 28 8Z"/><path className="sky-star" d="M10 9.5l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1Z"/><path className="sky-star late" d="M37 12l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7Z"/></>}
    {sky === 'cloud' && <><circle className="sky-body sky-peek" cx="30" cy="14" r="6"/>{cloud}</>}
    {sky === 'rain' && <>{cloud}{[15, 22, 29].map((x, i) => <path key={x} className="sky-drop" style={{ animationDelay: `${i * 0.28}s` }} d={`M${x} 35l-1.6 4`}/>)}</>}
    {sky === 'storm' && <>{cloud}<path className="sky-bolt" d="M24 31l-4 7h4l-2.5 6 7-9h-4.2l2.4-4Z"/></>}
    {sky === 'fog' && <>{[17, 24, 31].map((y, i) => <path key={y} className="sky-mist" style={{ animationDelay: `${i * 0.6}s` }} d={`M${8 + i * 2} ${y}h${28 - i * 4}`}/>)}</>}
    {sky === 'reading' && <><path d="M20 27.5V11a3 3 0 1 1 6 0v16.5a6 6 0 1 1-6 0Z"/><rect className="sky-mercury" x="21.8" y="15" width="2.4" height="14" rx="1.2"/><circle cx="23" cy="32.5" r="3.2" className="sky-bulb"/></>}
  </svg>
}

const placeName = (city: string) => city.replace(/^Região Metropolitana d[aeo]s?\s+/i, '').replace(/^Município de\s+/i, '')

/** Boletim do tempo do Rancho: canhoto escuro com o céu, papel com dia, temperatura e lugar. */
export function WeatherTicket({ weather, state, moment, onLocate }: { weather?: WeatherContext; state: 'loading' | 'ready' | 'denied'; moment: Moment; onLocate: () => void }) {
  const sky = skyFor(state === 'ready' ? weather : undefined, moment.part === 'noite', state === 'loading')
  return <div className={`weather-ticket ${state}`} role="status">
    <span className="weather-stub"><SkyGlyph sky={sky}/></span>
    <span className="weather-copy">
      <small>{moment.dayLabel}, {moment.partLabel}</small>
      {state === 'ready' && weather ? <>
        <strong><CountUp value={Math.round(weather.temperature)} suffix=" °C"/></strong>
        <span>{placeName(weather.city)} · <em>{weatherDescription(weather.weatherCode)}</em></span>
      </> : state === 'loading' ? <span className="weather-reading">Lendo o termômetro…</span>
        : <button type="button" onClick={onLocate}><MapPin size={15}/> Ver o clima daqui</button>}
    </span>
  </div>
}
