import styles from "./virtue-swarm-scene.module.css";

export function VirtueBee({ shade, body }: { shade: string; body: number }) {
  return <svg viewBox="0 0 120 90" aria-hidden="true" className={styles.bee}>
    <g className={styles.body}>
      <path d="M64 54L48 72M72 55L69 75M57 52L35 64" fill="none" stroke="#514b32" strokeWidth="2" strokeLinecap="round" />
      <g transform={`translate(62 48) scale(${body} 1) translate(-62 -48)`}>
        <ellipse cx="72" cy="49" rx="27" ry="16" fill={shade} />
        <path d="M69 34Q60 49 69 64M82 35Q75 49 82 63" stroke="#514731" strokeWidth="7" fill="none" />
        <path d="M95 45L104 49L95 53" fill="#514731" />
      </g>
      <ellipse cx="47" cy="45" rx="16" ry="17" fill="#72613e" />
      <circle cx="30" cy="43" r="10" fill="#484936" />
      <path d="M25 35Q19 22 13 27M31 34Q32 21 24 20" fill="none" stroke="#514731" strokeWidth="2" />
      <g className={styles.wings} fill="#fffdf2" fillOpacity=".78" stroke="#a1b3a3" strokeWidth="1.2">
        <ellipse cx="60" cy="24" rx="12" ry="25" transform="rotate(35 60 24)" />
        <ellipse cx="44" cy="23" rx="10" ry="23" transform="rotate(-29 44 23)" />
        <path d="M48 44L45 8M52 43L72 8" fill="none" strokeOpacity=".5" />
      </g>
      <path d="M36 37Q47 28 55 39" fill="none" stroke="#cfbc85" strokeWidth="3" strokeLinecap="round" />
    </g>
  </svg>;
}
