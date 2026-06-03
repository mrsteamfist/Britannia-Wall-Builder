export function WallFrescoBackground({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 320"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4955A" />
          <stop offset="60%" stopColor="#D4A96A" />
          <stop offset="100%" stopColor="#B87850" />
        </linearGradient>
        <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6B7C3A" />
          <stop offset="100%" stopColor="#4A5828" />
        </linearGradient>
        <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A8C40" />
          <stop offset="100%" stopColor="#5A6B2C" />
        </linearGradient>
        <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8B898" />
          <stop offset="100%" stopColor="#A89878" />
        </linearGradient>
        <filter id="fresco">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" result="blended" />
          <feComponentTransfer in="blended">
            <feFuncA type="linear" slope="0.7" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="1200" height="320" fill="url(#skyGrad)" />

      {/* Sun / faded circle */}
      <circle cx="200" cy="60" r="45" fill="#E8C080" opacity="0.5" />
      <circle cx="200" cy="60" r="30" fill="#F0D090" opacity="0.4" />

      {/* Far hills - Pict side (right, darker, wilder) */}
      <path d="M600 200 Q700 140 800 170 Q900 130 1000 160 Q1100 120 1200 150 L1200 320 L600 320 Z" fill="url(#hillFar)" opacity="0.85" />

      {/* Far hills - Roman side (left, more cultivated) */}
      <path d="M0 210 Q100 160 200 185 Q300 150 400 175 Q500 160 600 200 L600 320 L0 320 Z" fill="url(#hillFar)" opacity="0.75" />

      {/* Near hills - mid ground */}
      <path d="M0 240 Q150 200 300 220 Q450 205 600 225 Q750 210 900 228 Q1050 215 1200 235 L1200 320 L0 320 Z" fill="url(#hillNear)" opacity="0.9" />

      {/* Ground */}
      <rect x="0" y="268" width="1200" height="52" fill="#5A6B2C" opacity="0.8" />

      {/* === HADRIAN'S WALL === */}
      {/* Main wall body */}
      <rect x="0" y="215" width="1200" height="55" fill="url(#wallGrad)" />

      {/* Wall stone courses (horizontal mortar lines) */}
      {[225, 235, 245, 255].map((y, i) => (
        <line key={i} x1="0" y1={y} x2="1200" y2={y} stroke="#8B7850" strokeWidth="1.5" opacity="0.5" />
      ))}

      {/* Wall stone vertical joints */}
      {Array.from({ length: 30 }, (_, i) => {
        const x = i * 42 + (i % 2 === 0 ? 0 : 21);
        return (
          <g key={i}>
            <line x1={x} y1="215" x2={x} y2="235" stroke="#8B7850" strokeWidth="1" opacity="0.4" />
            <line x1={x + 21} y1="235" x2={x + 21} y2="255" stroke="#8B7850" strokeWidth="1" opacity="0.4" />
          </g>
        );
      })}

      {/* Wall crenellations (merlons) top */}
      {Array.from({ length: 60 }, (_, i) => (
        <rect key={i} x={i * 20 + 2} y="200" width="12" height="16" fill="#C0A878" stroke="#8B7850" strokeWidth="1" />
      ))}

      {/* === MILECASTLE TOWERS === */}
      {[200, 600, 1000].map((tx, i) => (
        <g key={i}>
          {/* Tower base */}
          <rect x={tx - 40} y="155" width="80" height="65" fill="#B8A070" stroke="#8B7850" strokeWidth="2" />
          {/* Tower stones */}
          <line x1={tx - 40} y1="175" x2={tx + 40} y2="175" stroke="#8B7850" strokeWidth="1.5" opacity="0.5" />
          <line x1={tx - 40} y1="195" x2={tx + 40} y2="195" stroke="#8B7850" strokeWidth="1.5" opacity="0.5" />
          <line x1={tx} y1="155" x2={tx} y2="220" stroke="#8B7850" strokeWidth="1" opacity="0.4" />
          {/* Tower crenellations */}
          {[-30, -15, 0, 15, 25].map((ox, j) => (
            <rect key={j} x={tx + ox - 5} y="148" width="9" height="10" fill="#C0A878" stroke="#8B7850" strokeWidth="1" />
          ))}
          {/* Gate arch */}
          <path d={`M${tx - 12} 220 L${tx - 12} 195 Q${tx} 183 ${tx + 12} 195 L${tx + 12} 220 Z`} fill="#3A2318" opacity="0.6" />
          {/* Keystone */}
          <rect x={tx - 3} y="183" width="6" height="8" fill="#8B7850" opacity="0.7" />
        </g>
      ))}

      {/* === ROMAN SOLDIER on wall (left side) === */}
      <g transform="translate(350, 180)" opacity="0.85">
        {/* Helmet */}
        <path d="M0 0 L8 0 L8 -5 Q4 -12 0 -5 Z" fill="#8B2A2A" />
        <line x1="-4" y1="-2" x2="12" y2="-2" stroke="#8B2A2A" strokeWidth="2" />
        {/* Head */}
        <circle cx="4" cy="4" r="5" fill="#C8A878" />
        {/* Body */}
        <rect x="-2" y="9" width="12" height="18" rx="1" fill="#8B2A2A" />
        {/* Skirt */}
        <path d="M-4 27 L-6 38 M0 27 L-1 38 M4 27 L4 38 M8 27 L9 38 M12 27 L13 38" stroke="#7A2020" strokeWidth="2" />
        {/* Shield */}
        <rect x="13" y="10" width="10" height="18" rx="2" fill="#8B2A2A" stroke="#6B1A1A" strokeWidth="1" />
        <line x1="18" y1="10" x2="18" y2="28" stroke="#C8A850" strokeWidth="1" />
        <line x1="13" y1="19" x2="23" y2="19" stroke="#C8A850" strokeWidth="1" />
        {/* Spear */}
        <line x1="-5" y1="40" x2="-5" y2="-15" stroke="#8B7850" strokeWidth="1.5" />
        <path d="M-8 -15 L-2 -15 L-5 -22 Z" fill="#888" />
      </g>

      {/* === ROMAN SOLDIER on wall (right side of left tower) === */}
      <g transform="translate(440, 182)" opacity="0.75">
        <path d="M0 0 L8 0 L8 -5 Q4 -12 0 -5 Z" fill="#8B2A2A" />
        <line x1="-4" y1="-2" x2="12" y2="-2" stroke="#8B2A2A" strokeWidth="2" />
        <circle cx="4" cy="4" r="5" fill="#C8A878" />
        <rect x="-2" y="9" width="12" height="18" rx="1" fill="#8B2A2A" />
        <path d="M-4 27 L-6 38 M0 27 L-1 38 M4 27 L4 38 M8 27 L9 38 M12 27 L13 38" stroke="#7A2020" strokeWidth="2" />
        <line x1="-5" y1="38" x2="-5" y2="-15" stroke="#8B7850" strokeWidth="1.5" />
        <path d="M-8 -15 L-2 -15 L-5 -22 Z" fill="#888" />
      </g>

      {/* === PICT WARRIORS (distant, right side, wild silhouettes) === */}
      <g transform="translate(980, 168)" opacity="0.6">
        {/* Pict 1 */}
        <circle cx="0" cy="-2" r="4" fill="#3A2318" />
        <path d="M-3 2 L-6 22 L3 22 L6 2 Z" fill="#3A2318" />
        <line x1="-8" y1="5" x2="10" y2="8" stroke="#3A2318" strokeWidth="2" />
        {/* Spear */}
        <line x1="10" y1="24" x2="18" y2="-10" stroke="#4A3018" strokeWidth="1.5" />
      </g>
      <g transform="translate(1020, 172)" opacity="0.55">
        <circle cx="0" cy="-2" r="4" fill="#3A2318" />
        <path d="M-3 2 L-5 20 L4 20 L5 2 Z" fill="#3A2318" />
        <line x1="-6" y1="4" x2="8" y2="6" stroke="#3A2318" strokeWidth="2" />
        <line x1="8" y1="22" x2="14" y2="-8" stroke="#4A3018" strokeWidth="1.5" />
      </g>
      <g transform="translate(1055, 175)" opacity="0.5">
        <circle cx="0" cy="-2" r="4" fill="#3A2318" />
        <path d="M-3 2 L-5 19 L4 19 L5 2 Z" fill="#3A2318" />
        <line x1="9" y1="21" x2="16" y2="-6" stroke="#4A3018" strokeWidth="1.5" />
      </g>

      {/* === TREES (Roman side, left) === */}
      {[80, 140, 165].map((tx, i) => (
        <g key={i} transform={`translate(${tx}, 200)`} opacity="0.7">
          <path d={`M0 0 L-${10 + i * 2} ${30 + i * 5} L${10 + i * 2} ${30 + i * 5} Z`} fill="#4A5828" />
          <path d={`M0 -15 L-${8 + i} ${15} L${8 + i} ${15} Z`} fill="#5A6B32" />
          <rect x="-3" y={30 + i * 5} width="6" height="8" fill="#5A3820" />
        </g>
      ))}

      {/* === ROMAN FORT (far left) === */}
      <g transform="translate(30, 215)" opacity="0.65">
        <rect x="0" y="-40" width="60" height="40" fill="#B8A070" stroke="#8B7850" strokeWidth="1.5" />
        <rect x="20" y="-40" width="20" height="25" fill="#A89060" stroke="#8B7850" strokeWidth="1" />
        {[-2, 8, 18, 28, 38, 48, 56].map((ox, i) => (
          <rect key={i} x={ox} y="-46" width="7" height="8" fill="#C0A878" stroke="#8B7850" strokeWidth="0.5" />
        ))}
        <rect x="25" y="-18" width="10" height="18" fill="#2A1808" opacity="0.7" />
      </g>

      {/* === VIGNETTE overlay (fresco aging effect) === */}
      <rect x="0" y="0" width="1200" height="320" fill="#8B5A2A" opacity="0.08" />
      <rect x="0" y="0" width="80" height="320" fill="#3A2318" opacity="0.15" />
      <rect x="1120" y="0" width="80" height="320" fill="#3A2318" opacity="0.15" />
      <rect x="0" y="0" width="1200" height="30" fill="#3A2318" opacity="0.12" />
      <rect x="0" y="290" width="1200" height="30" fill="#3A2318" opacity="0.12" />

      {/* Crack lines (fresco aging) */}
      <path d="M120 20 Q130 80 115 140 Q120 200 105 260" stroke="#3A2318" strokeWidth="0.8" opacity="0.12" fill="none" />
      <path d="M850 10 Q860 90 845 160 Q855 230 840 300" stroke="#3A2318" strokeWidth="0.6" opacity="0.1" fill="none" />
      <path d="M450 0 Q460 60 448 120" stroke="#3A2318" strokeWidth="0.5" opacity="0.08" fill="none" />
    </svg>
  );
}
