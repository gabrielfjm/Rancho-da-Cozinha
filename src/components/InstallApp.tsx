import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let installPrompt: InstallPrompt | null = null
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  installPrompt = event as InstallPrompt
  window.dispatchEvent(new Event('rancho-install-ready'))
})
window.addEventListener('appinstalled', () => {
  installPrompt = null
  window.dispatchEvent(new Event('rancho-install-ready'))
})

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function InstallApp() {
  const [installed, setInstalled] = useState(isInstalled)
  const [available, setAvailable] = useState(Boolean(installPrompt))
  const [instructions, setInstructions] = useState(false)
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const android = /Android/i.test(navigator.userAgent)

  useEffect(() => {
    const refresh = () => { setInstalled(isInstalled()); setAvailable(Boolean(installPrompt)) }
    window.addEventListener('rancho-install-ready', refresh)
    window.matchMedia('(display-mode: standalone)').addEventListener('change', refresh)
    return () => {
      window.removeEventListener('rancho-install-ready', refresh)
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', refresh)
    }
  }, [])

  if (installed) return null

  async function install() {
    if (!installPrompt) { setInstructions(true); return }
    const prompt = installPrompt
    installPrompt = null
    setAvailable(false)
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'dismissed') setInstructions(true)
  }

  return <aside className="install-app">
    <div className="install-app-heading"><Smartphone size={21}/><div><strong>Rancho no seu celular</strong><span>Instale na tela inicial. As novidades chegam pelo próprio site.</span></div></div>
    <button type="button" className="button button-small" onClick={() => void install()}><Download size={17}/>{available ? 'Instalar aplicativo' : 'Como instalar'}</button>
    {!ios && <a className="button button-small button-paper" href="/rancho-da-cozinha.apk" download><Smartphone size={17}/>{android ? 'Baixar o app Android' : 'App para Android (.apk)'}</a>}
    {instructions && <p className="install-app-instructions">{ios
      ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
      : 'No Chrome, abra o menu ⋮ e toque em “Instalar app” ou “Adicionar à tela inicial”.'}</p>}
  </aside>
}
