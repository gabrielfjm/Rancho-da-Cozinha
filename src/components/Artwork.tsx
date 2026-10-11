export function RanchMark({ size = 42 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M9 45h46M16 45V29l16-12 16 12v16M13 29l19-15 19 15M26 45V32h12v13M20 25v-7h7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 51h50M11 56h42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
export function Skillet({ size = 82 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true"><ellipse cx="44" cy="54" rx="29" ry="17" stroke="currentColor" strokeWidth="3"/><path d="M15 54v9c0 10 13 18 29 18s29-8 29-18v-9M73 57l20-8 3 7-22 10M29 46c4-10 10-15 15-22M45 43c1-8 5-14 11-19" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
}
export function Wheat({ size = 36 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 37V7M20 30c-7-2-10-6-10-11 7 0 10 4 10 11Zm0-8c7-2 10-6 10-11-7 0-10 4-10 11Zm0-5C14 15 12 11 12 7c6 1 8 4 8 10Zm0-8c5-3 6-5 6-8-5 1-6 4-6 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
}
export function Ornament() { return <div className="ornament" aria-hidden="true"><span>✦</span><i /><Wheat size={25}/><i /><span>✦</span></div> }
