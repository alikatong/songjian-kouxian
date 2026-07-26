// 全屏加载组件
import React from 'react'

const Loading = () => {
  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* 旋转金色圆圈 */}
        <div style={styles.spinner}></div>
        <p style={styles.text}>修炼中...</p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
  spinner: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '3px solid #21262d',
    borderTopColor: '#d4af37',
    borderRightColor: '#d4af37',
    animation: 'spin 1s linear infinite',
    boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)',
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
