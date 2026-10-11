import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { normalize } from '../lib/format'
import { pendulum, stack } from '../lib/motion'
import { InkCheck, Stamp } from './Feedback'

type Tool = 'grill' | 'skillet' | 'pot' | 'ladle' | 'spoon' | 'knife' | 'pan' | 'bowl' | 'blender' | 'sieve' | 'brush' | 'whisk' | 'rolling'
const matchers: [RegExp, Tool][] = [
  [/churrasqueira|grelha|espeto|brasa/, 'grill'], [/frigideira|chapa|wok|skillet/, 'skillet'],
  [/panela|cacarola|caldeir|cuscuzeira|leiteira|chaleira/, 'pot'], [/concha/, 'ladle'],
  [/faca|tabua|cutelo/, 'knife'], [/assadeira|forma|travessa|refratari|tabuleiro/, 'pan'],
  [/tigela|saladeira|bacia|vasilha|bowl|pote/, 'bowl'], [/liquidificador|processador|batedeira|mixer/, 'blender'],
  [/peneira|coador|escorredor/, 'sieve'], [/pincel/, 'brush'], [/fouet|batedor/, 'whisk'], [/rolo|cilindro/, 'rolling'],
  [/colher|espatula|pegador/, 'spoon']
]
const glyphs: Record<Tool, React.ReactNode> = {
  grill: <><path d="M4 9.5h16a8 5.5 0 0 1-16 0Z"/><path d="M6 6.5c1-1 1 -2.2 0-3.2M12 6.5c1-1 1-2.2 0-3.2M18 6.5c1-1 1-2.2 0-3.2"/><path d="M8.5 14.6 6 21M15.5 14.6 18 21M12 15v6"/></>,
  skillet: <><ellipse cx="9.5" cy="13" rx="6.5" ry="5"/><path d="M3 13v1.4c0 2.8 2.9 5 6.5 5s6.5-2.2 6.5-5V13M15.6 11.4 22 8.3"/></>,
  pot: <><path d="M4.5 10h15v6.5a3.5 3.5 0 0 1-3.5 3.5H8a3.5 3.5 0 0 1-3.5-3.5Z"/><path d="M3.5 10h17M2 12.5h2.5M19.5 12.5H22M9.5 7.3h5M12 7.3V5.6"/></>,
  ladle: <><path d="M17 3v8.5"/><path d="M8 12h11a5.5 5 0 0 1-11 0Z"/><path d="M17 3c-1.5 0-2 .8-2 1.6"/></>,
  spoon: <><ellipse cx="7.4" cy="7.4" rx="3.4" ry="4.6" transform="rotate(-45 7.4 7.4)"/><path d="M10 10l10.5 10.5"/></>,
  knife: <><path d="M3.5 20.5l4.8-4.8"/><path d="M8.3 15.7 19.5 4.5c1.4 2.2.7 4.7-1 6.4l-6.8 6.6Z"/></>,
  pan: <><path d="M3 9h18l-2.2 9.5H5.2Z"/><path d="M3 9 1.8 6.8M21 9l1.2-2.2M7 12.5h10"/></>,
  bowl: <><path d="M2.8 10.5h18.4a9.2 8 0 0 1-18.4 0Z"/><path d="M9 20h6M7 7.5c.8-1.6 2.4-2.6 4-2.4"/></>,
  blender: <><path d="M7.5 3h9l-1.6 10.5H9.1Z"/><path d="M7 13.5h10V21H7ZM11 17.3h2M16.4 5.5h2.2v4h-2.8"/></>,
  sieve: <><circle cx="10" cy="10" r="6.2"/><path d="M5.5 10h9M10 5.5v9M7 7l6 6M13 7l-6 6M14.6 14.6 21 21"/></>,
  brush: <><path d="M13.6 3.2 20.8 10.4l-3.9 1.2-4.5-4.5Z"/><path d="M12.4 7.1 4.2 15.3a2 2 0 0 0 2.9 2.9l8.2-8.2"/></>,
  whisk: <><path d="M12 21v-6.4"/><path d="M12 14.6c-4.2-2.8-4.2-11 0-12 4.2 1 4.2 9.2 0 12ZM12 14.6c-1.9-2.9-1.9-10 0-12 1.9 2 1.9 9.1 0 12Z"/></>,
  rolling: <><rect x="6.3" y="3.6" width="6" height="16.8" rx="3" transform="rotate(45 9.3 12)"/><path d="m3.2 15.3-1.7 1.7M15.3 3.2 17 1.5M20.8 8.6l1.7-1.7M8.6 20.8 6.9 22.5"/></>
}

export function toolFor(name: string): Tool {
  const text = normalize(name)
  return matchers.find(([pattern]) => pattern.test(text))?.[1] ?? 'spoon'
}
export function UtensilIcon({ name, size = 26 }: { name: string; size?: number }) {
  return <svg className="utensil-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyphs[toolFor(name)]}</svg>
}

const rest = [-3, 2.2, -1.4, 3, -2.2, 1.4]
/** Pegboard da cozinha: cada utensílio numa etiqueta pendurada. Toque para marcar como separado. */
export function UtensilRack({ items }: { items: string[] }) {
  const [ready, setReady] = useState<string[]>([])
  if (!items.length) return null
  const all = ready.length === items.length
  const toggle = (item: string) => setReady(current => current.includes(item) ? current.filter(x => x !== item) : [...current, item])
  return <div className="utensil-rack">
    <div className="rack-head"><div><h3>À mão</h3><p>Separe antes de acender o fogo.</p></div><span className="rack-count">{ready.length} de {items.length} na bancada</span></div>
    <motion.ul className="pegboard" initial="hidden" whileInView="shown" viewport={{ once: true, margin: '-30px' }} variants={stack(0.08)}>
      {items.map((item, index) => {
        const on = ready.includes(item)
        const angle = rest[index % rest.length]
        return <motion.li key={item} style={{ originY: 0 }} variants={{ hidden: { opacity: 0, y: -16, rotate: angle * 6 }, shown: { opacity: 1, y: 0, rotate: angle, transition: pendulum } }}>
          <motion.button type="button" className={`peg-tag${on ? ' is-ready' : ''}`} aria-pressed={on} onClick={() => toggle(item)} style={{ originY: 0 }} whileTap={{ rotate: angle * -3 }} animate={{ y: on ? 6 : 0 }} transition={pendulum}>
            <span className="peg-card">
              <UtensilIcon name={item}/>
              <span className="peg-name">{item}</span>
              <em>{on ? <><InkCheck size={13}/> separado</> : 'pegar'}</em>
            </span>
          </motion.button>
        </motion.li>
      })}
    </motion.ul>
    <AnimatePresence>{all && <Stamp className="rack-stamp" angle={-6}>Bancada pronta</Stamp>}</AnimatePresence>
  </div>
}
