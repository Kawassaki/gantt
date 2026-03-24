import { Link } from 'react-router-dom'

const designs = [
  {
    path: '/gantt-1',
    name: 'Noir Blueprint',
    description: 'Dark technical blueprint with cyan grid lines and crosshatch bars',
    gradient: 'linear-gradient(135deg, #0a0f1e 0%, #0d2847 50%, #003d5c 100%)',
    accent: '#00e5ff',
    font: 'JetBrains Mono',
  },
  {
    path: '/gantt-2',
    name: 'Warm Earth',
    description: 'Organic stationery planner with paper textures and serif typography',
    gradient: 'linear-gradient(135deg, #faf5eb 0%, #e8d5c0 50%, #c4613a 100%)',
    accent: '#c4613a',
    font: 'Fraunces',
    dark: false,
  },
  {
    path: '/gantt-3',
    name: 'Neon Terminal',
    description: 'Retro CRT terminal with neon glow, scanlines, and synthwave vibes',
    gradient: 'linear-gradient(135deg, #000 0%, #0a0a2e 50%, #1a002e 100%)',
    accent: '#39ff14',
    font: 'Orbitron',
  },
  {
    path: '/gantt-4',
    name: 'Swiss Editorial',
    description: 'Precise International Typographic Style with signal red accents',
    gradient: 'linear-gradient(135deg, #f8f6f2 0%, #e0dcd4 50%, #111 100%)',
    accent: '#e63226',
    font: 'Newsreader',
    dark: false,
  },
  {
    path: '/gantt-6',
    name: 'Candy Glass',
    description: 'Glassmorphism with animated gradient mesh and frosted panels',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #06b6d4 100%)',
    accent: '#ec4899',
    font: 'Sora',
  },
]

export default function Home() {
  return (
    <>
      <style>{`
        @keyframes homeFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(0.5deg); }
          66% { transform: translateY(4px) rotate(-0.3deg); }
        }
        @keyframes homeBlobDrift {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .home-card {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease;
        }
        .home-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 24px 48px rgba(0,0,0,0.15);
        }
        .home-card:hover .card-arrow {
          transform: translateX(4px);
          opacity: 1;
        }
        .card-arrow {
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0.5;
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#0c0a1a',
          position: 'relative',
          overflow: 'auto',
          fontFamily: "'Plus Jakarta Sans', 'Sora', sans-serif",
        }}
      >
        {/* Ambient blobs */}
        <div
          style={{
            position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
          }}
        >
          {[
            { color: '#7c3aed', size: 500, top: '-10%', left: '-5%', dur: '22s' },
            { color: '#ec4899', size: 400, top: '50%', right: '-8%', dur: '18s' },
            { color: '#06b6d4', size: 350, bottom: '-5%', left: '30%', dur: '25s' },
            { color: '#f97316', size: 300, top: '20%', left: '60%', dur: '20s' },
          ].map((blob, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: blob.size,
                height: blob.size,
                borderRadius: '50%',
                background: blob.color,
                opacity: 0.08,
                filter: 'blur(100px)',
                animation: `homeBlobDrift ${blob.dur} ease-in-out infinite`,
                animationDelay: `${i * -4}s`,
                top: blob.top,
                left: blob.left,
                right: (blob as any).right,
                bottom: (blob as any).bottom,
              }}
            />
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '80px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h1
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 56,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Gantt
            </h1>
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 18,
                color: 'rgba(255,255,255,0.5)',
                maxWidth: 480,
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Five unique interactive Gantt chart designs. Drag bars, resize tasks,
              manage subtasks, and mark milestones.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 24,
            }}
          >
            {designs.map((d, i) => {
              const isDark = d.dark !== false
              return (
                <Link
                  key={d.path}
                  to={d.path}
                  className="home-card"
                  style={{
                    textDecoration: 'none',
                    borderRadius: 20,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: `homeFloat 6s ease-in-out infinite`,
                    animationDelay: `${i * -1.2}s`,
                  }}
                >
                  <div
                    style={{
                      height: 160,
                      background: d.gradient,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 20,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: `'${d.font}', sans-serif`,
                        fontSize: 13,
                        fontWeight: 600,
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {d.path}
                    </span>
                  </div>
                  <div style={{ padding: '24px 24px 28px' }}>
                    <h2
                      style={{
                        fontFamily: "'Sora', sans-serif",
                        fontSize: 22,
                        fontWeight: 600,
                        color: '#fff',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {d.name}
                      <span className="card-arrow" style={{ fontSize: 18, color: d.accent }}>
                        &rarr;
                      </span>
                    </h2>
                    <p
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 14,
                        color: 'rgba(255,255,255,0.45)',
                        lineHeight: 1.55,
                      }}
                    >
                      {d.description}
                    </p>
                    <div
                      style={{
                        marginTop: 16,
                        display: 'flex',
                        gap: 6,
                      }}
                    >
                      {['Drag', 'Resize', 'Subtasks', 'Markers'].map(tag => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.35)',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
