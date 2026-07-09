import type { FC, ReactElement, SVGProps } from "react";

/**
 * Hand-authored, self-contained inline-SVG icons depicting Cambodian culture,
 * temples, wildlife, and the 6 Klaklok (Cambodian dice) symbols.
 *
 * Palette (Khmer heritage):
 *   sandstone/gold:  #E0A73C  #C6871F
 *   temple stone:    #C9A66B  #8A6D3B
 *   deep red:        #B4232E
 *   jade/teal:       #2E8B7F
 *   deep outline:    #3A2E24
 *   off-white:       #FBF3E4
 *
 * Every icon renders <svg viewBox="0 0 64 64"> and spreads props.
 */

type IconComponent = FC<SVGProps<SVGSVGElement>>;

// Shared svg attributes helper (kept inline per-icon for clarity/independence).
const S = {
  viewBox: "0 0 64 64",
  fill: "none" as const,
  xmlns: "http://www.w3.org/2000/svg",
};

/* ------------------------------------------------------------------ *
 * Temples & monuments
 * ------------------------------------------------------------------ */

const AngkorWat: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Angkor Wat" {...props}>
    <path d="M5 51h54v6H5z" fill="#8A6D3B" />
    <path d="M10 51V37h7v14M47 51V37h7v14" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M20 51V31h6v20M38 51V31h6v20" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M11 37l3-8 3 8M47 37l3-8 3 8M20 31l3-7 3 7M38 31l3-7 3 7" fill="#C6871F" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M27 51V22c0-5 10-5 10 0v29" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 6l5 10H27z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const BayonFace: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Bayon stone face" {...props}>
    <path d="M32 6c11 0 18 8 18 20 0 16-9 30-18 30S14 42 14 26C14 14 21 6 32 6z" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 22c3-3 8-3 10 0M32 22c2-3 7-3 10 0" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="25" cy="28" r="2.5" fill="#3A2E24" />
    <circle cx="39" cy="28" r="2.5" fill="#3A2E24" />
    <path d="M32 30v9" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M24 44c4 4 12 4 16 0" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" fill="#B4232E" />
    <path d="M32 6l4 8h-8z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const TaProhm: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Ta Prohm temple ruins" {...props}>
    <path d="M8 52h48v5H8z" fill="#8A6D3B" />
    <path d="M18 52V26c0-5 12-5 12 0v26" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 12l5 12H19z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M38 52V34h10v18" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* tree roots draping over the tower */}
    <path d="M22 8c-4 6 2 10-2 16s-6 8-3 14" stroke="#2E8B7F" strokeWidth="3" strokeLinecap="round" />
    <path d="M28 10c3 5-2 9 1 15s5 9 1 15" stroke="#2E8B7F" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M43 30c3 4 0 8 2 12" stroke="#2E8B7F" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const BanteaySrei: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Banteay Srei temple" {...props}>
    <path d="M9 52h46v5H9z" fill="#B4232E" />
    <path d="M17 52V30h10v22M37 52V30h10v22" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M17 30l5-9 5 9M37 30l5-9 5 9" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 52V18c0-4 8-4 8 0v34" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 6l4 12h-8z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M21 40h2M25 40h2M39 40h2M43 40h2M31 34h2" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PreahVihear: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Preah Vihear temple on cliff" {...props}>
    <path d="M4 46c10 2 20 2 30 0s20-2 26 0v11H4z" fill="#8A6D3B" />
    <path d="M4 46c10 2 20 2 30 0s20-2 26 0" stroke="#3A2E24" strokeWidth="1.5" fill="none" />
    <path d="M22 46V26h6v20M36 46V26h6v20" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 46V16c0-3 8-3 8 0v30" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 6l4 10h-8z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 40h40" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 40l-2-8h8l-2 8M40 40l-2-8h8l-2 8" stroke="#3A2E24" strokeWidth="1.5" fill="#C6871F" strokeLinejoin="round" />
  </svg>
);

const AngkorThomGate: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Angkor Thom gate" {...props}>
    <path d="M8 54h48v3H8z" fill="#8A6D3B" />
    <path d="M12 54V24h40v30" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* arched gateway */}
    <path d="M26 54V38c0-4 12-4 12 0v16z" fill="#3A2E24" />
    {/* face tower on top */}
    <path d="M24 24c0-9 4-16 8-16s8 7 8 16z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="29" cy="16" r="1.6" fill="#3A2E24" />
    <circle cx="35" cy="16" r="1.6" fill="#3A2E24" />
    <path d="M32 18v3M28 22c2 2 6 2 8 0" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 30h6M42 30h6" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Stupa: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Buddhist stupa" {...props}>
    <path d="M14 54h36v3H14z" fill="#8A6D3B" />
    <path d="M18 54V44h28v10z" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 44c0-10 4-16 10-16s10 6 10 16z" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M26 28c0-4 2-7 6-7s6 3 6 7" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 5l3 9h-6z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 14v7" stroke="#C6871F" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PrasatTower: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Prasat tower" {...props}>
    <path d="M16 54h32v3H16z" fill="#8A6D3B" />
    <path d="M20 54V26h24v28" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 26l10-6 10 6" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 20c0-6 3-10 8-10s8 4 8 10z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 4l3 8h-6z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M27 42h10M27 48h10" stroke="#3A2E24" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SilverPagoda: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Silver Pagoda" {...props}>
    <path d="M8 54h48v3H8z" fill="#8A6D3B" />
    <path d="M14 54V38h36v16" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* multi-tiered gold roofs */}
    <path d="M10 38l22-8 22 8z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14 30l18-7 18 7z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M18 23l14-6 14 6z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 6l3 11h-6z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 46h6M36 46h6" stroke="#3A2E24" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IndependenceMonument: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Independence Monument" {...props}>
    <path d="M14 54h36v3H14z" fill="#8A6D3B" />
    <path d="M20 54V46h24v8z" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M23 46V34h18v12" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M26 34V22h12v12" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M20 46l3-4h18l3 4M23 34l3-4h12l3 4" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M28 22c0-4 1-6 4-6s4 2 4 6z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 6l3 10h-6z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * Culture & people
 * ------------------------------------------------------------------ */

const ApsaraDancer: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Apsara dancer" {...props}>
    {/* crown */}
    <path d="M32 6l4 8h-8z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="32" cy="18" r="6" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" />
    {/* body / skirt */}
    <path d="M32 24c-6 0-8 6-8 12l-4 20h24l-4-20c0-6-2-12-8-12z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M20 56h24" stroke="#C6871F" strokeWidth="3" strokeLinecap="round" />
    {/* posed arms */}
    <path d="M26 30l-12 4 3 6" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M38 30l12 4-3 6" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M32 32v14" stroke="#C6871F" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Monk: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Buddhist monk" {...props}>
    <circle cx="32" cy="18" r="9" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" />
    <path d="M23 18a9 9 0 0118 0" fill="#E0A73C" stroke="#3A2E24" strokeWidth="1.5" />
    {/* saffron robe */}
    <path d="M32 26c-9 0-14 8-14 18v12h28V44c0-10-5-18-14-18z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 26l-8 30M32 26l8 30" stroke="#C6871F" strokeWidth="2" strokeLinecap="round" />
    <circle cx="29" cy="17" r="1.4" fill="#3A2E24" />
    <circle cx="35" cy="17" r="1.4" fill="#3A2E24" />
  </svg>
);

const KramaScarf: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Krama checkered scarf" {...props}>
    <path d="M12 14h40v22H12z" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M25 14v22M39 14v22M12 22h40M12 29h40" stroke="#FBF3E4" strokeWidth="3" />
    {/* draping tassels */}
    <path d="M14 36l-2 14M22 36l-2 14M42 36l2 14M50 36l2 14" stroke="#B4232E" strokeWidth="3" strokeLinecap="round" />
    <path d="M14 50l-2 4M22 50l-2 4M42 54l2-4M50 54l2-4" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Oxcart: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Traditional oxcart" {...props}>
    {/* cart bed */}
    <path d="M28 24h28l-4 14H30z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 24l-16 6" stroke="#8A6D3B" strokeWidth="3" strokeLinecap="round" />
    {/* wheel */}
    <circle cx="42" cy="46" r="9" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" />
    <circle cx="42" cy="46" r="2.5" fill="#3A2E24" />
    <path d="M42 37v18M33 46h18M36 40l12 12M48 40L36 52" stroke="#3A2E24" strokeWidth="1.5" />
    {/* ox */}
    <path d="M8 44c0-6 5-10 10-10h6v10l-4 8H12z" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 40l-3-4M8 44l-4-1" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 52v3M20 52v3" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PirogueBoat: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Pirogue boat" {...props}>
    {/* water */}
    <path d="M4 46c4 3 8 3 12 0s8-3 12 0 8 3 12 0 8-3 12 0v10H4z" fill="#2E8B7F" opacity="0.5" />
    {/* long slender hull, upturned bow */}
    <path d="M6 40c8 8 44 8 52 0-2 8-8 10-14 10H20c-6 0-12-2-14-10z" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M6 40c-2-4-1-7 2-8 3 3 3 6 0 8M58 40c2-4 1-7-2-8-3 3-3 6 0 8" fill="#C6871F" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M14 44h36" stroke="#3A2E24" strokeWidth="1.5" strokeLinecap="round" />
    {/* paddle */}
    <path d="M40 12l-8 26" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M40 8c4 0 5 4 3 8-3-1-5-4-3-8z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="1.5" />
  </svg>
);

const TukTuk: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Tuk-tuk" {...props}>
    {/* passenger cabin */}
    <path d="M26 22h26c3 0 4 2 4 5v19H26z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 18h24l4 8H26z" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M30 30h20v10H30z" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="1.5" />
    {/* motorbike front */}
    <path d="M26 46V32l-8 4v10" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M18 34l-4-2" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="18" cy="48" r="6" fill="#3A2E24" />
    <circle cx="18" cy="48" r="2" fill="#C9A66B" />
    <circle cx="44" cy="48" r="6" fill="#3A2E24" />
    <circle cx="44" cy="48" r="2" fill="#C9A66B" />
  </svg>
);

const Drum: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Khmer skor drum" {...props}>
    {/* barrel drum */}
    <path d="M20 16h24c2 0 3 2 2 4l-2 24c-1 2-3 4-10 4s-9-2-10-4l-2-24c-1-2 0-4 2-4z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <ellipse cx="32" cy="18" rx="12" ry="5" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" />
    {/* lacing */}
    <path d="M22 22l20 22M42 22L22 44M20 30h24M20 38h24" stroke="#B4232E" strokeWidth="1.5" />
    {/* stand */}
    <path d="M26 48l-6 8M38 48l6 8" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const KhmerMask: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Khmer theatre mask" {...props}>
    {/* Yeak/hanuman mask */}
    <path d="M32 8c10 0 15 8 15 18 0 14-7 30-15 30S17 40 17 26C17 16 22 8 32 8z" fill="#2E8B7F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 20c3-2 6-2 8 1M32 21c2-3 5-3 8-1" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M23 28l6-2M41 28l-6-2" stroke="#3A2E24" strokeWidth="3" strokeLinecap="round" />
    {/* fanged grin */}
    <path d="M24 40c4 5 12 5 16 0z" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 40v4M36 40v4" stroke="#3A2E24" strokeWidth="1.5" />
    {/* crown spikes */}
    <path d="M32 4l3 6h-6zM22 10l1 6-5-3zM42 10l-1 6 5-3z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const Lotus: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Lotus flower" {...props}>
    <path d="M32 22c4 6 4 20 0 28-4-8-4-22 0-28z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M32 26c8 4 12 16 10 24-8-2-13-14-10-24zM32 26c-8 4-12 16-10 24 8-2 13-14 10-24z" fill="#C6871F" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M32 30c11 0 18 8 20 18-11 2-20-6-20-18zM32 30c-11 0-18 8-20 18 11 2 20-6 20-18z" fill="#B4232E" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M14 48c6 3 12 4 18 4s12-1 18-4" stroke="#2E8B7F" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const IncenseHolder: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Incense holder" {...props}>
    {/* bowl */}
    <path d="M18 40h28c-1 8-6 12-14 12s-13-4-14-12z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M16 40h32" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M30 52h4v4h-4z" fill="#8A6D3B" />
    {/* incense sticks */}
    <path d="M24 40V16M32 40V12M40 40V16" stroke="#B4232E" strokeWidth="2" strokeLinecap="round" />
    {/* smoke */}
    <path d="M24 16c-2-3 2-4 0-7M32 12c-2-3 2-4 0-7M40 16c2-3-2-4 0-7" stroke="#2E8B7F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="24" cy="16" r="1.6" fill="#E0A73C" />
    <circle cx="32" cy="12" r="1.6" fill="#E0A73C" />
    <circle cx="40" cy="16" r="1.6" fill="#E0A73C" />
  </svg>
);

const PalmSugarPot: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Palm sugar pot" {...props}>
    {/* rounded clay pot */}
    <path d="M32 20c10 0 16 8 16 18s-6 16-16 16-16-6-16-16 6-18 16-18z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 18h16v4c0 2-3 3-8 3s-8-1-8-3z" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M22 34c6 3 14 3 20 0M20 42c8 3 16 3 24 0" stroke="#8A6D3B" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M27 13l2 5M37 13l-2 5" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * Wildlife & nature
 * ------------------------------------------------------------------ */

const Elephant: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Elephant" {...props}>
    <path d="M14 26c0-9 8-14 18-14s18 5 18 16v12h-8v-6c-4 3-16 3-20 0v6h-8z" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* ear */}
    <path d="M22 22c-6 0-8 6-6 12 5 1 8-3 8-8z" fill="#C9A66B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* trunk */}
    <path d="M16 34c-5 2-8 8-6 16 0 2 4 2 5 0 1-6 3-8 6-9" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="24" cy="24" r="2" fill="#3A2E24" />
    {/* tusk */}
    <path d="M20 40c-2 3-1 6 2 7" stroke="#FBF3E4" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M34 44v10M44 44v10" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const WaterBuffalo: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Water buffalo" {...props}>
    {/* body */}
    <path d="M14 32c0-6 6-8 14-8h12c8 0 10 4 10 10v6h-6v-4H20v4h-6z" fill="#3A2E24" opacity="0.85" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* head */}
    <path d="M12 26c-2-4 0-8 6-8s8 4 8 10v4h-8z" fill="#3A2E24" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* sweeping horns */}
    <path d="M14 20C6 18 4 10 10 8M20 20c8-2 10-10 4-12" stroke="#C9A66B" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="16" cy="24" r="1.6" fill="#FBF3E4" />
    <path d="M22 44v10M46 44v10" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const Gecko: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Tokay gecko" {...props}>
    {/* head at top, curling tail */}
    <path d="M32 8c6 0 10 4 10 10 0 5-3 8-3 12s4 6 4 12c0 8-6 12-11 12s-11-4-11-12c0-6 4-8 4-12s-3-7-3-12c0-6 4-10 10-10z" fill="#2E8B7F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="28" cy="16" r="1.8" fill="#3A2E24" />
    <circle cx="36" cy="16" r="1.8" fill="#3A2E24" />
    {/* splayed legs */}
    <path d="M23 24l-9-5M41 24l9-5M25 44l-10 6M39 44l10 6" stroke="#2E8B7F" strokeWidth="3" strokeLinecap="round" />
    <circle cx="26" cy="30" r="1.5" fill="#E0A73C" />
    <circle cx="38" cy="34" r="1.5" fill="#E0A73C" />
    <circle cx="30" cy="40" r="1.5" fill="#E0A73C" />
  </svg>
);

const NagaSerpent: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Naga serpent" {...props}>
    {/* coiling body */}
    <path d="M14 54c0-10 6-14 12-14s10 3 10 8-4 6-7 6-5-2-5-4" stroke="#2E8B7F" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M38 52c8 0 12-6 12-14 0-10-6-18-6-26" stroke="#2E8B7F" strokeWidth="5" strokeLinecap="round" fill="none" />
    {/* multi-head hood */}
    <path d="M44 14c-1-6 1-9 4-9s5 3 4 9M44 14c-6-4-9-2-10 2M52 14c6-4 9-2 10 2" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M40 14h16v6c0 4-3 7-8 7s-8-3-8-7z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="45" cy="20" r="1.5" fill="#3A2E24" />
    <circle cx="51" cy="20" r="1.5" fill="#3A2E24" />
    <path d="M44 26c2 3 6 3 8 0" stroke="#B4232E" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Garuda: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Garuda" {...props}>
    {/* spread wings */}
    <path d="M32 26L8 18c0 8 6 14 14 16zM32 26l24-8c0 8-6 14-14 16z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* body */}
    <path d="M28 24h8l-2 24h-4z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* head + beak */}
    <circle cx="32" cy="16" r="6" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" />
    <path d="M32 16l-8 2 6 3z" fill="#C6871F" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="34" cy="15" r="1.6" fill="#3A2E24" />
    {/* talons */}
    <path d="M30 48l-4 6M34 48l4 6" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const HamsaBird: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Hamsa sacred goose" {...props}>
    {/* body */}
    <path d="M18 42c-4-8 0-16 10-16 6 0 10 3 14 3 4 0 6-2 6-2 2 6-2 12-8 14-4 1-8 1-10 3-2 2-2 6-4 6-4 0-8-4-8-8z" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* graceful neck + head */}
    <path d="M42 27c4-2 6-6 5-11-1-4-5-5-7-2-2 4 0 8-2 12" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="44" cy="15" r="1.5" fill="#3A2E24" />
    <path d="M46 16l6-1-5 3z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="1.2" strokeLinejoin="round" />
    {/* tail + wing detail */}
    <path d="M16 40c-4-1-8 0-10 3 4 2 8 1 10-1M24 32c3 3 8 3 12 1" stroke="#C6871F" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M22 48v6M28 48v6" stroke="#E0A73C" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const SugarPalmTree: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Sugar palm tree" {...props}>
    <path d="M30 24c-1 10-2 20-3 32h6c-1-12-2-22-3-32z" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 26h8" stroke="#3A2E24" strokeWidth="1.5" />
    {/* fan of fronds */}
    <path d="M32 22C22 20 14 22 8 28c8 0 14-2 24-6zM32 22c10-2 18 0 24 6-8 0-14-2-24-6zM32 22c-6-6-8-12-6-18 4 4 6 10 6 18zM32 22c6-6 8-12 6-18-4 4-6 10-6 18zM32 22c-8-2-14 2-18 8 6-2 12-4 18-8zM32 22c8-2 14 2 18 8-6-2-12-4-18-8z" fill="#2E8B7F" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="32" cy="22" r="3" fill="#C6871F" stroke="#3A2E24" strokeWidth="1.5" />
  </svg>
);

const Coconut: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Coconut" {...props}>
    <circle cx="32" cy="34" r="20" fill="#8A6D3B" stroke="#3A2E24" strokeWidth="2" />
    <path d="M32 14c-6 6-6 34 0 40M32 14c6 6 6 34 0 40" stroke="#3A2E24" strokeWidth="1.5" opacity="0.5" fill="none" />
    {/* three eyes */}
    <circle cx="26" cy="24" r="2.4" fill="#3A2E24" />
    <circle cx="38" cy="24" r="2.4" fill="#3A2E24" />
    <circle cx="32" cy="20" r="2.4" fill="#3A2E24" />
    {/* husk fibers */}
    <path d="M20 40c4 2 8 2 12 2s8 0 12-2" stroke="#C6871F" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M32 8c-2 3 0 5 2 6" stroke="#2E8B7F" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const RiceBowl: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Bowl of rice" {...props}>
    {/* heap of rice */}
    <path d="M16 30c0-6 8-8 16-8s16 2 16 8z" fill="#FBF3E4" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* bowl */}
    <path d="M12 30h40c0 12-9 20-20 20S12 42 12 30z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M18 40c4 3 24 3 28 0" stroke="#8A6D3B" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* chopsticks */}
    <path d="M36 20l14-8M40 22l14-6" stroke="#8A6D3B" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const JasmineFlower: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Jasmine flower" {...props}>
    {/* five rounded petals */}
    <g stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round">
      <ellipse cx="32" cy="16" rx="7" ry="9" fill="#FBF3E4" />
      <ellipse cx="48" cy="28" rx="7" ry="9" fill="#FBF3E4" transform="rotate(72 48 28)" />
      <ellipse cx="42" cy="46" rx="7" ry="9" fill="#FBF3E4" transform="rotate(144 42 46)" />
      <ellipse cx="22" cy="46" rx="7" ry="9" fill="#FBF3E4" transform="rotate(216 22 46)" />
      <ellipse cx="16" cy="28" rx="7" ry="9" fill="#FBF3E4" transform="rotate(288 16 28)" />
    </g>
    <circle cx="32" cy="32" r="7" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" />
    <circle cx="32" cy="32" r="2.5" fill="#C6871F" />
  </svg>
);

const Kouprey: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Kouprey wild ox" {...props}>
    {/* body */}
    <path d="M16 34c0-6 6-8 12-8h14c6 0 8 4 8 10v8h-6v-6H22v6h-6z" fill="#3A2E24" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* dewlap */}
    <path d="M20 36c-2 4-1 8 2 10 2-1 3-4 2-8z" fill="#3A2E24" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    {/* head */}
    <path d="M12 28c-2-4 1-8 6-8s8 4 8 10v4h-8z" fill="#3A2E24" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* long lyre-shaped horns */}
    <path d="M13 22C8 16 8 8 12 6c1 6 3 10 6 14M21 22c5-6 5-14 1-16-1 6-3 10-6 14" stroke="#C9A66B" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="16" cy="26" r="1.6" fill="#FBF3E4" />
    <path d="M22 44v10M28 44v10M40 44v10M46 44v10" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M46 34l4 2" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * Klaklok (Kla Klouk) dice symbols
 * ------------------------------------------------------------------ */

const Tiger: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Tiger" {...props}>
    {/* head */}
    <path d="M32 12c11 0 18 8 18 20 0 13-8 20-18 20s-18-7-18-20c0-12 7-20 18-20z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* ears */}
    <path d="M16 16c2-4 6-4 8 0-2 4-6 4-8 0zM48 16c-2-4-6-4-8 0 2 4 6 4 8 0z" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* stripes */}
    <path d="M32 12v8M22 18l3 6M42 18l-3 6M17 28l6 2M47 28l-6 2" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
    {/* eyes */}
    <circle cx="25" cy="30" r="2.6" fill="#3A2E24" />
    <circle cx="39" cy="30" r="2.6" fill="#3A2E24" />
    {/* muzzle */}
    <path d="M26 40c3 4 9 4 12 0" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" fill="#FBF3E4" />
    <path d="M32 34l-3 5h6z" fill="#B4232E" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M28 44l-6 2M36 44l6 2" stroke="#3A2E24" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const Gourd: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Gourd calabash" {...props}>
    {/* bottle-gourd: small top bulb, large bottom bulb */}
    <path d="M32 12c5 0 8 3 8 7 0 3-2 5-2 8 0 4 8 8 8 18 0 9-6 15-14 15s-14-6-14-15c0-10 8-14 8-18 0-3-2-5-2-8 0-4 3-7 8-7z" fill="#2E8B7F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M28 30c3 2 5 2 8 0M22 44c6 3 14 3 20 0" stroke="#3A2E24" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
    {/* stem */}
    <path d="M32 12c0-4-2-6-5-7" stroke="#8A6D3B" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M27 6c3 0 4 2 3 4" stroke="#2E8B7F" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const Shrimp: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Shrimp prawn" {...props}>
    {/* curled body */}
    <path d="M44 14c-14 0-24 10-24 24 0 8 5 14 12 14 5 0 8-3 8-7s-3-6-6-6c-2 0-3 1-3 3" stroke="#B4232E" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* segment lines */}
    <path d="M38 16l-3 5M31 20l-2 6M25 27l-1 6M23 36l1 6M27 46l3 4" stroke="#FBF3E4" strokeWidth="2" strokeLinecap="round" />
    {/* head/rostrum + antennae */}
    <path d="M44 14c6-2 10-6 12-10M44 18c6 0 11-2 14-6" stroke="#B4232E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* tail fan */}
    <path d="M30 50c-3 4-3 8-1 11l6-5M32 50c1 5 3 8 7 9l-2-8" fill="#B4232E" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="44" cy="16" r="2.2" fill="#3A2E24" />
    {/* legs */}
    <path d="M34 34l-4 4M30 40l-4 3" stroke="#3A2E24" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const Fish: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Fish" {...props}>
    {/* body */}
    <path d="M8 32c8-12 26-12 34 0-8 12-26 12-34 0z" fill="#2E8B7F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* tail */}
    <path d="M42 32l14-10v20z" fill="#2E8B7F" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* fins */}
    <path d="M22 20c4 2 6 5 6 8M22 44c4-2 6-5 6-8" stroke="#3A2E24" strokeWidth="2" strokeLinecap="round" fill="#C6871F" strokeLinejoin="round" />
    {/* eye + gill */}
    <circle cx="16" cy="30" r="2.4" fill="#3A2E24" />
    <path d="M24 24c-2 5-2 11 0 16" stroke="#3A2E24" strokeWidth="1.8" strokeLinecap="round" />
    {/* scales */}
    <path d="M30 28c2 2 2 6 0 8M36 26c2 4 2 8 0 12" stroke="#FBF3E4" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

const Chicken: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Rooster chicken" {...props}>
    {/* body */}
    <path d="M18 34c-8 0-12 8-8 16 6-2 8-4 8-4s2 6 10 6c10 0 16-8 16-18 0-8-6-14-14-14-6 0-10 4-12 8z" fill="#E0A73C" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* head */}
    <circle cx="42" cy="20" r="7" fill="#C6871F" stroke="#3A2E24" strokeWidth="2" />
    {/* comb */}
    <path d="M38 14c1-4 3-4 4-1 1-3 3-3 4 0 1-3 3-2 3 1" fill="#B4232E" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    {/* beak + wattle */}
    <path d="M49 20l7-1-6 4z" fill="#B4232E" stroke="#3A2E24" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M44 26c0 3-2 5-4 4" fill="#B4232E" stroke="#3A2E24" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="44" cy="18" r="1.6" fill="#3A2E24" />
    {/* tail feathers */}
    <path d="M18 34c-6-4-10-12-8-20 6 4 9 10 10 16M16 32c-6-2-11-8-11-16 6 2 10 8 12 14" fill="#2E8B7F" stroke="#3A2E24" strokeWidth="1.5" strokeLinejoin="round" />
    {/* legs */}
    <path d="M28 48v6M36 48v6" stroke="#C6871F" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const Crab: IconComponent = ({ className = "w-full h-full", ...props }) => (
  <svg {...S} className={className} role="img" aria-label="Crab" {...props}>
    {/* top-down shell */}
    <path d="M18 30c0-8 6-12 14-12s14 4 14 12c0 6-6 10-14 10s-14-4-14-10z" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="27" cy="26" r="2" fill="#3A2E24" />
    <circle cx="37" cy="26" r="2" fill="#3A2E24" />
    <path d="M26 33c4 3 8 3 12 0" stroke="#3A2E24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* claws */}
    <path d="M18 28c-6-2-10 0-12-5 2 0 4 0 5 2-2-3 0-6 3-6-1 3 0 5 2 6" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    <path d="M46 28c6-2 10 0 12-5-2 0-4 0-5 2 2-3 0-6-3-6 1 3 0 5-2 6" fill="#B4232E" stroke="#3A2E24" strokeWidth="2" strokeLinejoin="round" />
    {/* legs */}
    <path d="M20 36l-8 6M22 40l-6 8M44 36l8 6M42 40l6 8M30 40l-4 10M34 40l4 10" stroke="#3A2E24" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const KHMER_ICONS: Record<string, IconComponent> = {
  // temples & monuments
  "angkor-wat": AngkorWat,
  "bayon-face": BayonFace,
  "ta-prohm": TaProhm,
  "banteay-srei": BanteaySrei,
  "preah-vihear": PreahVihear,
  "angkor-thom-gate": AngkorThomGate,
  stupa: Stupa,
  "prasat-tower": PrasatTower,
  "silver-pagoda": SilverPagoda,
  "independence-monument": IndependenceMonument,
  // culture & people
  "apsara-dancer": ApsaraDancer,
  monk: Monk,
  "krama-scarf": KramaScarf,
  oxcart: Oxcart,
  "pirogue-boat": PirogueBoat,
  "tuk-tuk": TukTuk,
  drum: Drum,
  "khmer-mask": KhmerMask,
  lotus: Lotus,
  "incense-holder": IncenseHolder,
  "palm-sugar-pot": PalmSugarPot,
  // wildlife & nature
  elephant: Elephant,
  "water-buffalo": WaterBuffalo,
  gecko: Gecko,
  "naga-serpent": NagaSerpent,
  garuda: Garuda,
  "hamsa-bird": HamsaBird,
  "sugar-palm-tree": SugarPalmTree,
  coconut: Coconut,
  "rice-bowl": RiceBowl,
  "jasmine-flower": JasmineFlower,
  kouprey: Kouprey,
  // klaklok dice symbols
  tiger: Tiger,
  gourd: Gourd,
  shrimp: Shrimp,
  fish: Fish,
  chicken: Chicken,
  crab: Crab,
};

/** The 32 icon ids that make up the memory-game "Cambodia" theme. */
export const MEMORY_ICON_IDS: string[] = [
  "angkor-wat",
  "bayon-face",
  "ta-prohm",
  "banteay-srei",
  "preah-vihear",
  "angkor-thom-gate",
  "stupa",
  "prasat-tower",
  "silver-pagoda",
  "independence-monument",
  "apsara-dancer",
  "monk",
  "krama-scarf",
  "oxcart",
  "pirogue-boat",
  "tuk-tuk",
  "drum",
  "khmer-mask",
  "lotus",
  "incense-holder",
  "palm-sugar-pot",
  "elephant",
  "water-buffalo",
  "gecko",
  "naga-serpent",
  "garuda",
  "hamsa-bird",
  "sugar-palm-tree",
  "coconut",
  "rice-bowl",
  "jasmine-flower",
  "kouprey",
];

/**
 * Convenience wrapper. Looks up KHMER_ICONS[id]; returns null for an unknown id.
 */
export function KhmerIcon({
  id,
  className = "w-full h-full",
  ...props
}: { id: string; className?: string } & SVGProps<SVGSVGElement>): ReactElement | null {
  const Icon = KHMER_ICONS[id];
  if (!Icon) return null;
  return <Icon className={className} {...props} />;
}
