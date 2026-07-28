// 全屏加载组件
import React from 'react'

const Loading = () => {
  return (
    <div style={styles.overlay} role="status" aria-label="正在读取洞府">
      <div style={styles.container}>
        <div style={styles.loader} aria-hidden="true"><span style={styles.loaderProgress} /></div>
        <p style={styles.text}>正在进入洞府…</p>
      </div>

      <style>{`
        @keyframes loadingSweep {
          from { transform: translateX(-110%); }
          to { transform: translateX(270%); }
        }
        @keyframes textGlow {
          0% { text-shadow: 0 0 5px #8a7020; }
          50% { text-shadow: 0 0 15px #d4af37, 0 0 25px #8a7020; }
          100% { text-shadow: 0 0 5px #8a7020; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#0d1117',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  loader: {
    width: '120px',
    height: '4px',
    overflow: 'hidden',
    borderRadius: '2px',
    backgroundColor: '#263329',
    boxShadow: '0 0 15px rgba(212, 175, 55, 0.16)',
  },
  loaderProgress: {
    display: 'block',
    width: '42%',
    height: '100%',
    borderRadius: '2px',
    background: 'linear-gradient(90deg, transparent, #d4af37, #f0d68b, transparent)',
    animation: 'loadingSweep 1.4s ease-in-out infinite',
  },
  text: {
    color: '#d4af37',
    fontSize: '16px',
    letterSpacing: '4px',
    fontFamily: '"仿宋", "FangSong", "楷体", "KaiTi", serif',
    animation: 'textGlow 2s ease-in-out infinite',
  },
}

export default Loading
