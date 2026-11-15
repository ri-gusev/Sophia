import { useId } from "react";
import { GREECE_COASTLINE } from "./greece-coastline";
import styles from "./greece-map.module.css";

// Same equirectangular projection as generate-greece-map.py; Athens point:
// https://ungegn.un.org/dashboard/cities/details?id=77
const ATHENS = { x: 34 + (23.6930332478 - 18.5) * 37 * .78, y: 88 + (42.7 - 37.9906883528) * 37 };

export function GreeceMap() {
  const id = useId();
  return <svg viewBox="0 0 400 420" className={styles.map} role="img" aria-label="Карта Греции с отметкой Афин">
    <title>Карта Греции с отметкой Афин</title>
    <desc>Береговая линия Греции и островов Эгейского моря. Афины отмечены на полуострове Аттика. Современные государственные границы не показаны.</desc>
    <defs>
      <radialGradient id={`${id}-sea`}>
        <stop offset="0" stopColor="var(--mint)" stopOpacity=".22" />
        <stop offset="1" stopColor="var(--page-background)" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-edges`} r="50%">
        <stop offset=".8" stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </radialGradient>
      <mask id={`${id}-coast`}><rect x="0" y="88" width="400" height="311" fill={`url(#${id}-edges)`} /></mask>
    </defs>
    <ellipse cx="200" cy="245" rx="200" ry="200" fill={`url(#${id}-sea)`} />
    <g mask={`url(#${id}-coast)`}>
      <path d="M34 151H366M34 225H366M34 299H366M34 373H366M77 88V407M164 88V407M250 88V407M337 88V407" className={styles.grid} />
      <path d={GREECE_COASTLINE} className={styles.land} fillRule="evenodd" />
    </g>
    <g className={styles.compass} aria-hidden="true">
      <text x="350" y="37" textAnchor="middle">С</text>
      <path d="M350 72V47M346 53L350 47L354 53" />
    </g>
    <text x="128" y="181" className={styles.region} transform="rotate(-24 128 181)">ГРЕЦИЯ</text>
    <text x="282" y="314" className={styles.sea} textAnchor="middle" transform="rotate(-12 282 314)">
      <tspan x="282">Эгейское</tspan><tspan x="282" dy="18">море</tspan>
    </text>
    <text x="207" y="410" className={styles.island} textAnchor="middle">Крит</text>
    <circle cx={ATHENS.x} cy={ATHENS.y} r="18" className={styles.halo} />
    <path d={`M${ATHENS.x} ${ATHENS.y}L215 232H276`} className={styles.leader} />
    <circle cx={ATHENS.x} cy={ATHENS.y} r="6" className={styles.marker} />
    <text x="219" y="222" className={styles.city}>Афины</text>
  </svg>;
}
