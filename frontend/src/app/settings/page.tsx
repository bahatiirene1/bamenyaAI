'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, User, Sliders, Brain, Globe, Plus, X, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';

type Tab = 'profile' | 'preferences' | 'context';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, preferences, userContext, loading, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Track initialization to prevent form reset after save
  const initializedRef = useRef({ profile: false, preferences: false, context: false });

  // Form states
  const [formProfile, setFormProfile] = useState({
    full_name: '',
    phone: '',
    preferred_language: 'en',
  });

  const [formPreferences, setFormPreferences] = useState({
    default_model: 'gpt-4.1',
    response_style: 'balanced',
    theme: 'system',
    font_size: 'medium',
    email_notifications: true,
  });

  const [formContext, setFormContext] = useState({
    occupation: '',
    interests: [] as string[],
    expertise_areas: [] as string[],
    goals: '',
    country: 'Rwanda',
    city: '',
    custom_instructions: '',
  });

  const [newInterest, setNewInterest] = useState('');
  const [newExpertise, setNewExpertise] = useState('');

  // Initialize form data from profile - only once per data type
  useEffect(() => {
    if (profile && !initializedRef.current.profile) {
      initializedRef.current.profile = true;
      setFormProfile({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        preferred_language: profile.preferred_language || 'en',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (preferences && !initializedRef.current.preferences) {
      initializedRef.current.preferences = true;
      setFormPreferences({
        default_model: preferences.default_model || 'gpt-4.1',
        response_style: preferences.response_style || 'balanced',
        theme: preferences.theme || 'system',
        font_size: preferences.font_size || 'medium',
        email_notifications: preferences.email_notifications ?? true,
      });
    }
  }, [preferences]);

  useEffect(() => {
    if (userContext && !initializedRef.current.context) {
      initializedRef.current.context = true;
      console.log('[Init] Initializing context from userContext:', userContext);
      console.log('[Init] Interests from DB:', userContext.interests);
      console.log('[Init] Expertise from DB:', userContext.expertise_areas);
      setFormContext({
        occupation: userContext.occupation || '',
        interests: Array.isArray(userContext.interests) ? userContext.interests : [],
        expertise_areas: Array.isArray(userContext.expertise_areas) ? userContext.expertise_areas : [],
        goals: userContext.goals || '',
        country: userContext.country || 'Rwanda',
        city: userContext.city || '',
        custom_instructions: userContext.custom_instructions || '',
      });
    }
  }, [userContext]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const supabase = createClient();

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      let error = null;

      if (activeTab === 'profile') {
        console.log('[Save] Saving profile:', formProfile);
        const result = await supabase
          .from('profiles')
          .update(formProfile)
          .eq('id', user.id);
        error = result.error;
        console.log('[Save] Profile result:', result);
      } else if (activeTab === 'preferences') {
        console.log('[Save] Saving preferences:', formPreferences);
        const result = await supabase
          .from('user_preferences')
          .update(formPreferences)
          .eq('user_id', user.id);
        error = result.error;
        console.log('[Save] Preferences result:', result);
      } else if (activeTab === 'context') {
        // Prepare update data with proper array handling
        const updateData = {
          occupation: formContext.occupation,
          interests: formContext.interests,
          expertise_areas: formContext.expertise_areas,
          goals: formContext.goals,
          country: formContext.country,
          city: formContext.city,
          custom_instructions: formContext.custom_instructions,
        };

        console.log('[Save] === CONTEXT SAVE DEBUG ===');
        console.log('[Save] User ID from auth:', user.id);

        // Verify auth session
        const { data: authData } = await supabase.auth.getSession();
        console.log('[Save] Auth session exists:', !!authData.session);
        console.log('[Save] Auth user ID:', authData.session?.user?.id);
        console.log('[Save] Auth matches user:', authData.session?.user?.id === user.id);
        console.log('[Save] Saving context:', updateData);
        console.log('[Save] Interests array:', JSON.stringify(formContext.interests));
        console.log('[Save] Expertise array:', JSON.stringify(formContext.expertise_areas));
        console.log('[Save] Array types - interests:', typeof formContext.interests, 'isArray:', Array.isArray(formContext.interests));

        // First verify the row exists and we can read it
        const checkResult = await supabase
          .from('user_context')
          .select('id, user_id, interests')
          .eq('user_id', user.id)
          .single();

        console.log('[Save] Pre-update check:', checkResult);

        if (checkResult.error) {
          console.error('[Save] Cannot read user_context - RLS issue?', checkResult.error);
          throw new Error(`RLS check failed: ${checkResult.error.message}`);
        }

        // Now do the update
        const result = await supabase
          .from('user_context')
          .update(updateData)
          .eq('user_id', user.id)
          .select();

        console.log('[Save] Context update result:', result);
        console.log('[Save] Updated rows:', result.data?.length || 0);

        if (result.data && result.data.length === 0) {
          console.error('[Save] Update returned 0 rows - RLS may have blocked the update!');
          throw new Error('Update blocked by RLS policy - 0 rows affected');
        }

        console.log('[Save] Updated data from DB:', result.data);
        error = result.error;
      }

      if (error) throw error;

      // Show success immediately
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setSaving(false);

      // Refresh profile in background - allow re-initialization on next page visit
      refreshProfile().catch(console.error);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
      setSaving(false);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !formContext.interests.includes(newInterest.trim())) {
      setFormContext(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()],
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormContext(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest),
    }));
  };

  const addExpertise = () => {
    if (newExpertise.trim() && !formContext.expertise_areas.includes(newExpertise.trim())) {
      setFormContext(prev => ({
        ...prev,
        expertise_areas: [...prev.expertise_areas, newExpertise.trim()],
      }));
      setNewExpertise('');
    }
  };

  const removeExpertise = (expertise: string) => {
    setFormContext(prev => ({
      ...prev,
      expertise_areas: prev.expertise_areas.filter(e => e !== expertise),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-10 h-10 border-2 border-[var(--rw-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'preferences' as Tab, label: 'Preferences', icon: Sliders },
    { id: 'context' as Tab, label: 'AI Context', icon: Brain },
  ];

  const inputClass = "w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)] focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-[var(--foreground)] mb-2";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--rw-blue)]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--rw-green)]/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="h-14 px-4 border-b border-[var(--border)] flex items-center gap-4 sticky top-0 bg-[var(--background)]/80 backdrop-blur-xl z-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/')}
          className="p-2 rounded-xl hover:bg-[var(--muted)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--muted-foreground)]" />
        </motion.button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg rw-gradient flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold rw-gradient-text">Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 relative z-10">
        {/* Message Toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-[var(--rw-green)]/20 border border-[var(--rw-green)]/30 text-[var(--rw-green)]'
                  : 'bg-red-500/20 border border-red-500/30 text-red-400'
              }`}
            >
              {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-[var(--muted)] rounded-xl">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rw-gradient rounded-lg"
                  transition={{ type: 'spring', duration: 0.5 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </motion.button>
          ))}
        </div>

        {/* Form Card */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl p-6 md:p-8 border border-[var(--border)]"
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  value={formProfile.full_name}
                  onChange={e => setFormProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={formProfile.phone}
                  onChange={e => setFormProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="+250 ..."
                />
              </div>
              <div>
                <label className={labelClass}>Preferred Language</label>
                <select
                  value={formProfile.preferred_language}
                  onChange={e => setFormProfile(prev => ({ ...prev, preferred_language: e.target.value }))}
                  className={inputClass}
                >
                  <option value="en">English</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Default AI Model</label>
                <select
                  value={formPreferences.default_model}
                  onChange={e => setFormPreferences(prev => ({ ...prev, default_model: e.target.value }))}
                  className={inputClass}
                >
                  <option value="gpt-4.1">GPT-4.1 (Best Quality)</option>
                  <option value="deepseek-chat">DeepSeek (Fast & Cheap)</option>
                  <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Response Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {['concise', 'balanced', 'detailed'].map(style => (
                    <motion.button
                      key={style}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormPreferences(prev => ({ ...prev, response_style: style }))}
                      className={`py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                        formPreferences.response_style === style
                          ? 'rw-gradient text-white'
                          : 'bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--rw-blue)]'
                      }`}
                    >
                      {style}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {['dark', 'light', 'system'].map(theme => (
                    <motion.button
                      key={theme}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormPreferences(prev => ({ ...prev, theme }))}
                      className={`py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                        formPreferences.theme === theme
                          ? 'rw-gradient text-white'
                          : 'bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--rw-blue)]'
                      }`}
                    >
                      {theme}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Font Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {['small', 'medium', 'large'].map(size => (
                    <motion.button
                      key={size}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormPreferences(prev => ({ ...prev, font_size: size }))}
                      className={`py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                        formPreferences.font_size === size
                          ? 'rw-gradient text-white'
                          : 'bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--rw-blue)]'
                      }`}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={formPreferences.email_notifications}
                  onChange={e => setFormPreferences(prev => ({ ...prev, email_notifications: e.target.checked }))}
                  className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] text-[var(--rw-blue)] focus:ring-[var(--rw-blue)] cursor-pointer"
                />
                <label htmlFor="emailNotifications" className="text-sm text-[var(--foreground)] cursor-pointer">
                  Receive email notifications
                </label>
              </div>
            </div>
          )}

          {/* Context Tab */}
          {activeTab === 'context' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl rw-gradient-subtle border border-[var(--rw-blue)]/20">
                <p className="text-sm text-[var(--muted-foreground)]">
                  <Brain className="inline-block mr-2 text-[var(--rw-blue)]" size={16} />
                  This information helps the AI provide more personalized responses tailored to you.
                </p>
              </div>

              <div>
                <label className={labelClass}>Occupation</label>
                <input
                  type="text"
                  value={formContext.occupation}
                  onChange={e => setFormContext(prev => ({ ...prev, occupation: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g., Software Engineer, Student, Business Owner"
                />
              </div>

              <div>
                <label className={labelClass}>Interests</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    className={`${inputClass} flex-1`}
                    placeholder="Add an interest..."
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addInterest}
                    className="px-4 py-3 rw-gradient text-white rounded-xl"
                  >
                    <Plus size={20} />
                  </motion.button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {formContext.interests.map(interest => (
                      <motion.span
                        key={interest}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--rw-blue)]/10 text-[var(--rw-blue)] rounded-full text-sm border border-[var(--rw-blue)]/20"
                      >
                        {interest}
                        <button onClick={() => removeInterest(interest)} className="hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className={labelClass}>Areas of Expertise</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newExpertise}
                    onChange={e => setNewExpertise(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                    className={`${inputClass} flex-1`}
                    placeholder="Add an expertise area..."
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addExpertise}
                    className="px-4 py-3 rw-gradient text-white rounded-xl"
                  >
                    <Plus size={20} />
                  </motion.button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {formContext.expertise_areas.map(expertise => (
                      <motion.span
                        key={expertise}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--rw-green)]/10 text-[var(--rw-green)] rounded-full text-sm border border-[var(--rw-green)]/20"
                      >
                        {expertise}
                        <button onClick={() => removeExpertise(expertise)} className="hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className={labelClass}>Goals</label>
                <textarea
                  value={formContext.goals}
                  onChange={e => setFormContext(prev => ({ ...prev, goals: e.target.value }))}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="What are you trying to achieve? e.g., Learn programming, Grow my business..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Country</label>
                  <div className="relative">
                    <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      type="text"
                      value={formContext.country}
                      onChange={e => setFormContext(prev => ({ ...prev, country: e.target.value }))}
                      className={`${inputClass} pl-12`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={formContext.city}
                    onChange={e => setFormContext(prev => ({ ...prev, city: e.target.value }))}
                    className={inputClass}
                    placeholder="e.g., Kigali"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Custom Instructions</label>
                <textarea
                  value={formContext.custom_instructions}
                  onChange={e => setFormContext(prev => ({ ...prev, custom_instructions: e.target.value }))}
                  rows={4}
                  className={`${inputClass} resize-none`}
                  placeholder="Special instructions for the AI, e.g., 'Always respond in Kinyarwanda first, then English'"
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-8 py-3.5 rw-gradient text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
