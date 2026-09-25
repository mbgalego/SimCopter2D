/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold shadow-lg shadow-emerald-950/40 transition active:scale-95"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install PWA</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-medium backdrop-blur-md transition active:scale-95"
        >
          <Share className="w-3.5 h-3.5 text-sky-400" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-sky-400">Install SimCopter on iOS</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold">1</span>
                  Tap the Safari <strong>Share</strong> icon in the bottom menu.
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold">2</span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold">3</span>
                  Tap <strong>Add</strong> to play offline in full screen!
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-sky-600 hover:bg-sky-500 py-2 text-xs font-bold text-white transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
