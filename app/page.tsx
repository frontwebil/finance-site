export default function Home() {
  return (
    <div className="page-shell">
      <div className="bot-card">
        <header className="topbar">
          <button className="icon-button close-button" aria-label="Close">
            ×
          </button>

          <div className="header-title">Bot Info</div>

          <div className="header-actions">
            <button className="icon-button action-button" aria-label="Share">
              ⎋
            </button>
            <button className="icon-button action-button" aria-label="Menu">
              ⋮
            </button>
          </div>
        </header>

        <main className="content-panel">
          <div className="art-area" aria-hidden="true">
            <svg viewBox="0 0 420 260" className="illustration" role="img">
              <defs>
                <linearGradient id="cardGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#1fa8ff" />
                  <stop offset="100%" stopColor="#0c5dd8" />
                </linearGradient>
                <linearGradient id="arrowGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#f7df2d" />
                  <stop offset="50%" stopColor="#f7d922" />
                  <stop offset="100%" stopColor="#ffdd57" />
                </linearGradient>
                <linearGradient id="purpleGrad" x1="0%" x2="100%" y1="50%" y2="50%">
                  <stop offset="0%" stopColor="#8d5ae6" />
                  <stop offset="100%" stopColor="#b85ae6" />
                </linearGradient>
              </defs>

              <circle cx="65" cy="40" r="12" fill="#f5d94f" opacity="0.8" />
              <circle cx="238" cy="36" r="9" fill="#f5d94f" opacity="0.8" />
              <circle cx="330" cy="68" r="10" fill="#f5d94f" opacity="0.8" />
              <circle cx="315" cy="26" r="8" fill="#f5d94f" opacity="0.8" />

              <g opacity="0.9">
                <ellipse cx="118" cy="170" rx="56" ry="26" fill="#f3f7ff" />
                <ellipse cx="260" cy="183" rx="62" ry="30" fill="#f3f7ff" />
              </g>

              <g transform="translate(72 20) rotate(8 122 80)">
                <rect x="0" y="20" width="178" height="112" rx="18" fill="url(#cardGrad)" />
                <rect x="0" y="20" width="178" height="112" rx="18" fill="rgba(255,255,255,0.08)" />
                <rect x="18" y="42" width="110" height="28" rx="5" fill="#f7d539" />
                <rect x="64" y="74" width="78" height="18" rx="4" fill="#ffed8a" opacity="0.9" />
                <rect x="18" y="98" width="76" height="16" rx="3" fill="#f3f7ff" opacity="0.8" />
                <path d="M136 50 L160 50 L160 60 L136 60 Z" fill="#f7d539" />
                <path d="M131 84 L176 84 L176 100 L131 100 Z" fill="#f7d539" opacity="0.9" />
                <path d="M136 50 L149 73 L136 96 L110 96 L110 50 Z" fill="#f5b43c" opacity="0.4" />
              </g>

              <g transform="translate(162 66)">
                <path
                  d="M14 78 C 42 28, 86 16, 168 36 C 207 46, 236 60, 268 78 L 259 86 C 240 74, 212 62, 170 52 C 95 35, 51 47, 26 88 Z"
                  fill="url(#purpleGrad)"
                  opacity="0.95"
                />
                <path
                  d="M248 76 L312 51 L312 101 Z"
                  fill="#ffdf57"
                  transform="rotate(10 250 76)"
                />
                <path
                  d="M0 80 C 95 16, 155 70, 260 35"
                  fill="none"
                  stroke="url(#arrowGrad)"
                  strokeWidth="36"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M235 31 L302 42 L268 99" fill="url(#arrowGrad)" opacity="0.95" />
              </g>

              <g>
                <circle cx="250" cy="130" r="20" fill="#fffefc" />
                <circle cx="250" cy="130" r="12" fill="#eaeef7" />
                <path d="M250 121 L250 130 L257 137" stroke="#5d6a8a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M245 94 L255 94" stroke="#5d6a8a" strokeWidth="3" strokeLinecap="round" />
                <path d="M250 130 L255 111" stroke="#5d6a8a" strokeWidth="3" strokeLinecap="round" />
              </g>

              <g>
                <circle cx="325" cy="180" r="24" fill="#3dc07a" />
                <path d="M311 182 L323 194 L339 168" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>

              <g>
                <circle cx="108" cy="118" r="12" fill="#f6d74a" />
                <path d="M108 110 L108 118 L116 118" stroke="#f7f2d5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
            </svg>
          </div>

          <div className="bottom-bar">
            <div className="mute-pill">
              <span className="mute-icon">◔</span>
              <span>mute</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
