import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Users,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  LogOut,
  Search,
  RefreshCw
} from 'lucide-react';
import type { Unit, Level, AdminUser } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { soundEngine } from '../../audio/soundEngine';
import { UnitEditorModal } from './UnitEditorModal';
import { LessonEditorModal } from './LessonEditorModal';

interface AdminDashboardProps {
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'curriculum' | 'users'>('curriculum');

  // Curriculum State
  const [curriculum, setCurriculum] = useState<Unit[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});
  const [curriculumLoading, setCurriculumLoading] = useState(true);

  // Modals
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedUnitForLesson, setSelectedUnitForLesson] = useState<{ id: number; title: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<Level | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);

  // User Management State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadCurriculum = async () => {
    setCurriculumLoading(true);
    try {
      const res = await api.getAdminCurriculum();
      setCurriculum(res.curriculum);
      // Expand first 2 units by default
      const defaultExpanded: Record<number, boolean> = {};
      res.curriculum.slice(0, 2).forEach(u => {
        defaultExpanded[u.id] = true;
      });
      setExpandedUnits(prev => ({ ...defaultExpanded, ...prev }));
    } catch (err: any) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setCurriculumLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(res.users);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const toggleExpand = (unitId: number) => {
    soundEngine.playButtonClick();
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  // Reorder Units
  const handleMoveUnit = async (index: number, direction: 'up' | 'down') => {
    soundEngine.playButtonClick();
    const newCurriculum = [...curriculum];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newCurriculum.length) return;

    const temp = newCurriculum[index];
    newCurriculum[index] = newCurriculum[targetIdx];
    newCurriculum[targetIdx] = temp;
    setCurriculum(newCurriculum);

    try {
      await api.reorderUnits(newCurriculum.map(u => u.id));
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Failed to reorder units' });
      loadCurriculum();
    }
  };

  // Delete Unit
  const handleDeleteUnit = async (unitId: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" and all its lessons?`)) {
      return;
    }
    soundEngine.playButtonClick();
    try {
      await api.deleteUnit(unitId);
      soundEngine.playSuccessChime();
      setStatusMsg({ type: 'success', text: `Unit "${title}" deleted.` });
      loadCurriculum();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setStatusMsg({ type: 'error', text: 'Failed to delete unit' });
    }
  };

  // Reorder Lessons within Unit
  const handleMoveLesson = async (unitId: number, lessonIdx: number, direction: 'up' | 'down') => {
    soundEngine.playButtonClick();
    const unit = curriculum.find(u => u.id === unitId);
    if (!unit) return;

    const newLevels = [...unit.levels];
    const targetIdx = direction === 'up' ? lessonIdx - 1 : lessonIdx + 1;
    if (targetIdx < 0 || targetIdx >= newLevels.length) return;

    const temp = newLevels[lessonIdx];
    newLevels[lessonIdx] = newLevels[targetIdx];
    newLevels[targetIdx] = temp;

    setCurriculum(prev =>
      prev.map(u => (u.id === unitId ? { ...u, levels: newLevels } : u))
    );

    try {
      const lessonIds = newLevels.map(l => l.lessonDbId).filter(Boolean) as number[];
      if (lessonIds.length > 0) {
        await api.reorderLessons(lessonIds);
      }
    } catch (err: any) {
      loadCurriculum();
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonDbId: number, title: string) => {
    if (!window.confirm(`Delete lesson "${title}"?`)) return;
    soundEngine.playButtonClick();
    try {
      await api.deleteLesson(lessonDbId);
      soundEngine.playSuccessChime();
      setStatusMsg({ type: 'success', text: `Lesson "${title}" deleted.` });
      loadCurriculum();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setStatusMsg({ type: 'error', text: 'Failed to delete lesson' });
    }
  };

  // Toggle User Role (Admin <-> User)
  const handleToggleUserRole = async (targetUser: AdminUser) => {
    soundEngine.playButtonClick();
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const actionText = newRole === 'admin' ? 'promote to Administrator' : 'demote to standard Student';

    if (!window.confirm(`Are you sure you want to ${actionText} for ${targetUser.display_name} (${targetUser.email || targetUser.username})?`)) {
      return;
    }

    try {
      await api.updateUserRole(targetUser.id, newRole);
      soundEngine.playSuccessChime();
      setStatusMsg({
        type: 'success',
        text: `Updated ${targetUser.display_name} to ${newRole}.`
      });
      loadUsers();
    } catch (err: any) {
      soundEngine.playErrorSound();
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update user role' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl border-2 border-rose-200">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 text-2xl font-black">
            🚫
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Access Denied</h2>
          <p className="text-xs text-slate-500 mb-6 font-medium">
            This administration portal requires administrator credentials.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.display_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b-2 border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-800 leading-tight">Cadence Admin Portal</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Music Teacher CMS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Curriculum design, lesson generation, & user administration
            </p>
          </div>
        </div>

        {/* Tab switchers & Exit */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                setActiveTab('curriculum');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'curriculum'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Curriculum & Lessons</span>
            </button>
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                setActiveTab('users');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'users'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users ({users.length || '...'})</span>
            </button>
          </div>

          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Admin</span>
          </button>
        </div>
      </header>

      {/* Status notification toast */}
      {statusMsg && (
        <div
          className={`mx-4 sm:mx-8 mt-4 p-3 rounded-2xl text-xs font-bold flex items-center justify-between border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-rose-50 text-rose-800 border-rose-300'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline text-[11px] font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8">
        {/* TAB 1: CURRICULUM CMS */}
        {activeTab === 'curriculum' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Curriculum & Lesson Organizer</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Organize units, reorder difficulty progression, or add custom lessons tailored to your music students.
                </p>
              </div>
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setEditingUnit(null);
                  setShowUnitModal(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-[0_3px_0_0_#047857] duo-btn-push flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Unit</span>
              </button>
            </div>

            {curriculumLoading ? (
              <div className="text-center py-16 text-slate-400 font-bold">Loading curriculum tree...</div>
            ) : curriculum.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-300 p-8">
                <p className="text-slate-500 font-bold mb-4">No curriculum units found.</p>
                <button
                  onClick={() => setShowUnitModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                >
                  Create First Unit
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {curriculum.map((unit, uIdx) => {
                  const isExpanded = expandedUnits[unit.id] ?? false;
                  return (
                    <div
                      key={unit.id}
                      className="bg-white rounded-3xl border-2 border-slate-200 shadow-xs overflow-hidden transition-all"
                    >
                      {/* Unit Header Card */}
                      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-white">
                        <div
                          className="flex items-center gap-3.5 flex-1 cursor-pointer select-none"
                          onClick={() => toggleExpand(unit.id)}
                        >
                          <div
                            style={{ backgroundColor: unit.color }}
                            className="w-12 h-12 rounded-2xl text-white flex items-center justify-center text-2xl shadow-sm shrink-0"
                          >
                            {unit.icon || '🎵'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                Unit {unit.id}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {unit.levels?.length || 0} Lessons
                              </span>
                            </div>
                            <h3 className="text-base font-black text-slate-800">{unit.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-1">{unit.subtitle}</p>
                          </div>
                        </div>

                        {/* Unit Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Move Up */}
                          <button
                            onClick={() => handleMoveUnit(uIdx, 'up')}
                            disabled={uIdx === 0}
                            title="Move Unit Up"
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          {/* Move Down */}
                          <button
                            onClick={() => handleMoveUnit(uIdx, 'down')}
                            disabled={uIdx === curriculum.length - 1}
                            title="Move Unit Down"
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => {
                              soundEngine.playButtonClick();
                              setEditingUnit(unit);
                              setShowUnitModal(true);
                            }}
                            title="Edit Unit Details"
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUnit(unit.id, unit.title)}
                            title="Delete Unit"
                            className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {/* Expand/Collapse Toggle */}
                          <button
                            onClick={() => toggleExpand(unit.id)}
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 ml-1"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Lessons List */}
                      {isExpanded && (
                        <div className="px-4 pb-4 sm:px-6 sm:pb-5 pt-2 bg-slate-50/70 border-t border-slate-100 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                              Lessons in Unit {unit.id}
                            </span>
                            <button
                              onClick={() => {
                                soundEngine.playButtonClick();
                                setSelectedUnitForLesson({ id: unit.id, title: unit.title });
                                setEditingLesson(null);
                                setShowLessonModal(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-xs duo-btn-push flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Lesson</span>
                            </button>
                          </div>

                          {(!unit.levels || unit.levels.length === 0) ? (
                            <div className="p-4 text-center text-xs font-bold text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                              No lessons in this unit yet. Click "Add Lesson" to create one.
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {unit.levels.map((lvl, lIdx) => (
                                <div
                                  key={lvl.lessonDbId || `${unit.id}_${lvl.id}_${lIdx}`}
                                  className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-100 font-black text-xs text-slate-700 flex items-center justify-center shrink-0">
                                      #{lIdx + 1}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-black text-slate-800">{lvl.title}</h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          {lvl.type}
                                        </span>
                                        <span className="text-[10px] font-bold text-amber-600">
                                          +{lvl.xpReward || 20} XP
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-500 line-clamp-1">{lvl.description}</p>
                                    </div>
                                  </div>

                                  {/* Lesson action buttons */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleMoveLesson(unit.id, lIdx, 'up')}
                                      disabled={lIdx === 0}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-20"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveLesson(unit.id, lIdx, 'down')}
                                      disabled={lIdx === unit.levels.length - 1}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-20"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        soundEngine.playButtonClick();
                                        setSelectedUnitForLesson({ id: unit.id, title: unit.title });
                                        setEditingLesson(lvl);
                                        setShowLessonModal(true);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                      title="Edit Lesson"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {lvl.lessonDbId && (
                                      <button
                                        onClick={() => handleDeleteLesson(lvl.lessonDbId!, lvl.title)}
                                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                        title="Delete Lesson"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-800">User Administration</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Manage registered users, inspect ear training progress, and elevate teachers or assistants to administrator.
                </p>
              </div>
              <button
                onClick={loadUsers}
                disabled={usersLoading}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs self-start"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Users</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by username, email, or display name..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border-2 border-slate-200 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">XP / Streak</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                          Loading user directory...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                          No users matched your query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const isSelf = u.id === user?.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* User name & avatar */}
                            <td className="py-3 px-4 flex items-center gap-2.5">
                              <span className="text-2xl">{u.avatar || '🎧'}</span>
                              <div>
                                <div className="font-black text-slate-800 flex items-center gap-1.5">
                                  <span>{u.display_name || u.username}</span>
                                  {isSelf && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">@{u.username}</div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3 px-4 text-slate-600">
                              {u.email || <span className="italic text-slate-400">Guest / None</span>}
                            </td>

                            {/* Role Badge */}
                            <td className="py-3 px-4">
                              {u.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                                  <ShieldCheck className="w-3 h-3" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  Student
                                </span>
                              )}
                            </td>

                            {/* XP / Streak */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-amber-600">{u.xp || 0} XP</div>
                              <div className="text-[10px] text-slate-400">🔥 {u.streak_days || 0}d streak</div>
                            </td>

                            {/* Created */}
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </td>

                            {/* Action Button */}
                            <td className="py-3 px-4 text-right">
                              {isSelf ? (
                                <span className="text-[11px] text-slate-400 italic">Current Session</span>
                              ) : (
                                <button
                                  onClick={() => handleToggleUserRole(u)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                                    u.role === 'admin'
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                                  }`}
                                >
                                  {u.role === 'admin' ? 'Remove Admin' : 'Make Admin ⭐'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Unit Editor Modal */}
      {showUnitModal && (
        <UnitEditorModal
          unit={editingUnit}
          onClose={() => setShowUnitModal(false)}
          onSaved={() => {
            setShowUnitModal(false);
            loadCurriculum();
          }}
        />
      )}

      {/* Lesson Editor Modal */}
      {showLessonModal && selectedUnitForLesson && (
        <LessonEditorModal
          unitId={selectedUnitForLesson.id}
          unitTitle={selectedUnitForLesson.title}
          lesson={editingLesson}
          onClose={() => setShowLessonModal(false)}
          onSaved={() => {
            setShowLessonModal(false);
            loadCurriculum();
          }}
        />
      )}
    </div>
  );
};
