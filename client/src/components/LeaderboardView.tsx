import React, { useEffect, useState } from 'react';
import { Trophy, Flame } from 'lucide-react';
import type { LeaderboardUser } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { soundEngine } from '../audio/soundEngine';

export const LeaderboardView: React.FC = () => {
  const { user } = useAuth();
  const [board, setBoard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoard();
  }, []);

  const loadBoard = async () => {
    try {
      const data = await api.getLeaderboard();
      // Ensure current user is in board
      if (user && !data.leaderboard.some(u => u.id === user.id)) {
        data.leaderboard.push({
          id: user.id,
          display_name: user.display_name,
          avatar: user.avatar,
          xp: user.xp,
          streak_days: user.streak_days
        });
        data.leaderboard.sort((a, b) => b.xp - a.xp);
      }
      setBoard(data.leaderboard);
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="text-sm font-black text-slate-400 w-6 text-center">{rank}</span>;
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-[480px] mx-auto select-none">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 border border-purple-300 text-purple-800 text-xs font-black uppercase tracking-wider mb-2">
          <Trophy className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
          <span>Ruby League</span>
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Weekly Leaderboard</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Top 3 earners advance to the Diamond Division!
        </p>
      </div>

      {/* Leaderboard List */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">Loading standings...</div>
        ) : (
          board.map((item, idx) => {
            const rank = idx + 1;
            const isMe = user?.id === item.id;

            return (
              <div
                key={item.id}
                onClick={() => soundEngine.playButtonClick()}
                className={`flex items-center justify-between p-3.5 border-b last:border-b-0 transition-colors ${
                  isMe
                    ? 'bg-emerald-50 border-emerald-200 font-bold'
                    : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7">
                    {getRankBadge(rank)}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">
                    {item.avatar || '🎧'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-extrabold ${isMe ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {item.display_name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                      <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                      <span>{item.streak_days} days</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-slate-700">{item.xp}</span>
                  <span className="text-xs font-bold text-slate-400 ml-1">XP</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
