/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/90 border border-amber-400/40 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white shadow-xl pointer-events-none animate-pulse">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Full Simulation Running Local</span>
    </div>
  );
};
