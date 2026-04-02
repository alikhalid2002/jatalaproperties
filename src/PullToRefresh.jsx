import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ onRefresh, children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  
  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].pageY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].pageY;
    const distance = currentY - startY.current;
    
    if (distance > 0 && containerRef.current.scrollTop === 0) {
      // Apply resistance
      const dampedDistance = Math.min(distance * 0.4, PULL_THRESHOLD + 20);
      setPullDistance(dampedDistance);
      
      // Prevent default pull-to-refresh in some browsers
      if (distance > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        // Delay to show success animation
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }, 800);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 h-full overflow-y-auto no-scrollbar touch-pan-y"
      style={{ 
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-all duration-200"
        style={{ 
          top: 0,
          height: pullDistance,
          opacity: pullDistance / PULL_THRESHOLD,
          transform: `translateY(${Math.min(pullDistance - 40, 0)}px)`,
          zIndex: 50
        }}
      >
        <div className={`p-2 bg-slate-800 border border-slate-700/50 rounded-full shadow-2xl flex items-center gap-2 ${isRefreshing ? 'animate-bounce' : ''}`}>
           <RefreshCw size={16} className={`text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 3}deg)` }} />
           {pullDistance >= PULL_THRESHOLD && (
             <span className="text-[10px] font-black text-white uppercase tracking-widest px-1">
               {isRefreshing ? 'Refreshing...' : 'Release to Refresh'}
             </span>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
