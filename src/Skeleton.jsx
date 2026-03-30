import React from 'react';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-slate-800/40 rounded-2xl ${className}`} />
);

export const DashboardSkeleton = () => (
  <div className="flex-1 flex flex-col justify-center gap-8 lg:gap-12 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8 w-full">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-slate-800/40 p-6 lg:p-8 rounded-[32px] border border-slate-700/50 flex flex-col items-center gap-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
    
    <div className="flex-1 flex items-center justify-center p-4 min-h-[340px]">
       <Skeleton className="w-[340px] h-[340px] rounded-full" />
    </div>

    <div className="mt-8">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-slate-800/40 p-8 rounded-[40px] border border-slate-700/50 flex flex-col justify-center gap-6 min-h-[220px]">
    <div className="flex justify-center">
      <Skeleton className="h-8 w-40 rounded-full" />
    </div>
    <div className="space-y-3 flex flex-col items-center">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

export default Skeleton;
