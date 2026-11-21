// Original SVG teaching illustrations, deliberately not historical reconstructions.
export function DefinitionSituationArt({ kind }: { kind: "honesty" | "power" }) {
  const power = kind === "power";
  return <svg viewBox="0 0 600 340" aria-hidden="true" focusable="false">
    <path fill="#efe9d6" d="M0 0H600V340H0z" />
    <path fill="#faf5e7" d="M0 0H600V244H0z" />
    <path d="M40 0H64V256H40zM520 0H545V256H520z" fill="#e5ddc5" />
    <path d="M25 0H81V17H25zM505 0H560V17H505zM25 250H81V265H25zM505 250H560V265H505z" fill="#d3cbb3" />
    <path d="M160 0V180H440V0" fill="#dce2ce" />
    <path d="M180 180V60Q300-40 420 60V180" fill="#edf0dd" />
    <path d="M160 182H440" stroke="#b7c3a3" strokeWidth="8" />
    <ellipse cx="295" cy="310" rx="190" ry="16" fill="#c8bfa3" opacity=".35" />
    <path d="M85 232H510V248H85zM110 248H128V329H110zM470 248H488V329H470z" fill="#b79870" />
    <path d="M95 233H503" stroke="#d7bd95" strokeWidth="4" />
    {power ? <>
      <path d="M337 136H451V285H337z" fill="#d3c09a" />
      <path d="M350 146H439V237H350z" fill="#80917d" />
      <path d="M331 253H456V269H331z" fill="#b59c73" />
      <path d="M365 116Q389 93 413 117L445 243H337z" fill="#7d8d78" />
      <path d="M370 128L408 145L394 234H354z" fill="#b3bd9e" />
      <path d="M372 233L359 302H384L401 240M401 236L414 303H438L428 233" fill="#87977f" />
      <path d="M356 302H385V312H346Q342 304 356 302M415 303H441V313H413z" fill="#776953" />
      <path d="M371 117L355 170L281 150" fill="none" stroke="#bf9576" strokeWidth="16" strokeLinecap="round" />
      <path d="M283 150L258 144M282 154L269 165" stroke="#bf9576" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="393" cy="86" rx="24" ry="30" fill="#c69e7f" />
      <path d="M369 84Q362 51 393 52Q424 57 418 83L408 69L376 71" fill="#6c6552" />
      <path d="M374 98Q392 121 410 98L404 116H382z" fill="#766952" />
      <path d="M373 62Q394 52 414 65" stroke="#c4ad69" strokeWidth="6" fill="none" />
      <path d="M190 224L207 184H265L251 229z" fill="#f3ead0" stroke="#b3a27f" />
      <path d="M214 197L251 198M211 206L247 208" stroke="#a3a388" strokeWidth="2" />
      <g fill="#c4aa67"><ellipse cx="304" cy="225" rx="15" ry="5"/><ellipse cx="308" cy="218" rx="15" ry="5"/><ellipse cx="305" cy="211" rx="15" ry="5"/></g>
      <path d="M153 104V163M126 115L183 103M131 114L122 143H143zM179 104L169 141H191z" fill="none" stroke="#9b947b" strokeWidth="3" />
    </> : <>
      <path d="M223 128Q255 111 280 133L310 292H194z" fill="#b0baa0" />
      <path d="M234 129L272 160L254 285H209z" fill="#d9debc" />
      <path d="M223 279L219 313H241L249 280M264 279L273 313H295L285 278" fill="#8a997b" />
      <path d="M220 310H242V321H207Q204 313 220 310M275 310H296V321H271z" fill="#7a7056" />
      <ellipse cx="251" cy="96" rx="24" ry="30" fill="#ceac88" />
      <path d="M229 92Q220 64 246 61Q274 57 277 85L264 78L232 81z" fill="#82765a" />
      <path d="M235 137L250 168L269 150" fill="none" stroke="#ceac88" strokeWidth="13" strokeLinecap="round" />
      <path d="M277 142L308 193L354 213" fill="none" stroke="#ceac88" strokeWidth="13" strokeLinecap="round" />
      <path d="M328 199L396 204L382 233L317 225z" fill="#f5eed9" stroke="#b8ac8c" />
      <path d="M340 210L379 213M336 217L368 219" stroke="#a6ac8b" strokeWidth="2" />
      <path d="M393 223Q420 217 428 228Q408 236 393 223" fill="#697d6b" opacity=".5" />
      <path d="M419 200L432 220" stroke="#8b846b" strokeWidth="3" />
      <path d="M430 222H448L446 231H431z" fill="#8a947c" />
    </>}
  </svg>;
}
