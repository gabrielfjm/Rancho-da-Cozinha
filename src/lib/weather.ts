export type WeatherContext = {
  temperature: number
  apparentTemperature: number
  weatherCode: number
  city: string
  region?: string
  regionCode?: string
  countryCode?: string
  latitude: number
  longitude: number
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    timeout: 12000,
    maximumAge: 30 * 60 * 1000
  }))
}

async function forecast(latitude: number, longitude: number) {
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`)
  if (!response.ok) throw new Error('Não foi possível consultar o clima agora.')
  const weather = await response.json() as { current?: { temperature_2m?: number; apparent_temperature?: number; weather_code?: number } }
  const temperature = weather.current?.temperature_2m
  if (typeof temperature !== 'number') throw new Error('A temperatura não ficou disponível.')
  return { temperature, apparentTemperature: weather.current?.apparent_temperature ?? temperature, weatherCode: weather.current?.weather_code ?? 0 }
}

export async function refreshWeather(previous: WeatherContext): Promise<WeatherContext> {
  return { ...previous, ...await forecast(previous.latitude, previous.longitude) }
}

export async function weatherAtCurrentLocation(): Promise<WeatherContext> {
  if (!navigator.geolocation) throw new Error('Este aparelho não oferece localização.')
  const location = await position()
  const latitude = Number(location.coords.latitude.toFixed(4))
  const longitude = Number(location.coords.longitude.toFixed(4))
  const [current, placeResponse] = await Promise.all([
    forecast(latitude, longitude),
    fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`)
  ])
  const place = placeResponse.ok ? await placeResponse.json() as { city?: string; locality?: string; principalSubdivision?: string; principalSubdivisionCode?: string; countryCode?: string } : {}
  return {
    ...current,
    city: place.city || place.locality || 'Sua região',
    region: place.principalSubdivision,
    regionCode: place.principalSubdivisionCode,
    countryCode: place.countryCode,
    latitude,
    longitude
  }
}

export function weatherDescription(code: number) {
  if (code === 0) return 'céu aberto'
  if (code <= 3) return 'algumas nuvens'
  if ([45, 48].includes(code)) return 'neblina'
  if (code >= 51 && code <= 67) return 'chuva'
  if (code >= 80 && code <= 82) return 'pancadas de chuva'
  if (code >= 95) return 'trovoadas'
  return 'tempo agradável'
}
