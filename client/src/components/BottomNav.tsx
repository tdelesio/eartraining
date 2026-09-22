import React from 'react';
import { Compass, Music, Zap, Trophy, ShoppingBag } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

export type TabType = 'learn' | 'practice' | 'daily' | 'leaderboard' | 'shop';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'learn' as TabType, label: 'Learn', icon: Compass, color: 'text-emerald-500' },
    { id: 'practice' as TabType, label: 'Practice', icon: Music, color: 'text-sky-500' },
    { id: 'daily' as TabType, label: 'Daily', icon: Zap, color: 'text-amber-500' },
    { id: 'leaderboard' as TabType, label: 'Leagues', icon: Trophy, color: 'text-purple-500' },
    { id: 'shop' as TabType, label: 'Shop', icon: ShoppingBag, color: 'text-rose-500' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 safe-area-pb max-w-[480px] mx-auto select-none">
      <div className="flex items-center justify-around py-1.5 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundEngine.playButtonClick();
                onChangeTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all ${
                isActive ? 'scale-105' : 'opacity-65 hover:opacity-100'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-slate-100' : ''
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? tab.color : 'text-slate-500'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight mt-0.5 ${
                  isActive ? 'text-slate-900 font-extrabold' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
