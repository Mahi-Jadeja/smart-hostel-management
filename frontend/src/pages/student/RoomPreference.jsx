import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  HeartHandshake,
  Save,
  Trash2,
  CheckCircle2,
  Heart,
  UserCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import studentService from '../../services/student.service';
import toast from 'react-hot-toast';

/**
 * RoomPreference Page
 *
 * Features:
 * 1. View current preference (who I chose + mutual status)
 * 2. NEW: "Who chose you" section — students who selected current user
 *    - Shows their name, branch, year
 *    - "Accept" button = calls updateRoomPreference with their _id
 *      This creates a mutual pair automatically
 * 3. Search & select a preferred roommate
 * 4. Clear preference
 *
 * Data flow for "who chose me":
 *   - Call searchRoommateOptions with limit=200 (no query)
 *   - Filter results where has_selected_you === true
 *   - These are students who have set current user as their preferred roommate
 *   - Accepting one = sets current user's preference to that person = mutual pair
 */
const RoomPreference = () => {
  // ---- My current preference ----
  const [currentPreference, setCurrentPreference] = useState(null);
  const [loadingPreference, setLoadingPreference] = useState(true);

  // ---- Who chose me ----
  const [whoChoseMe, setWhoChoseMe] = useState([]);
  const [loadingChoseMe, setLoadingChoseMe] = useState(true);

  // ---- Search ----
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // ---- Selection + save ----
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [saving, setSaving] = useState(false);

  /**
   * Load current preference and "who chose me" in parallel.
   * Both are needed on mount.
   */
  const loadAll = async () => {
    try {
      // Run both in parallel
      const [prefRes, choseRes] = await Promise.allSettled([
        studentService.getRoomPreference(),
        studentService.getWhoChoseMe(),
      ]);

      // ---- My preference ----
      if (prefRes.status === 'fulfilled') {
        setCurrentPreference(prefRes.value.data.data.preference);
      } else {
        toast.error('Failed to load your room preference');
      }

      // ---- Who chose me ----
      // getWhoChoseMe returns all roommate options
      // We filter where has_selected_you === true
      if (choseRes.status === 'fulfilled') {
        const allOptions = choseRes.value.data.data.options || [];
        const choseMe = allOptions.filter((s) => s.has_selected_you === true);
        setWhoChoseMe(choseMe);
      }
      // If this fails silently, not a critical error — just show empty
    } catch (error) {
      console.error('Failed to load preference data:', error);
    } finally {
      setLoadingPreference(false);
      setLoadingChoseMe(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /**
   * Search for potential roommates by name/PRN/email/branch.
   */
  const handleSearch = async () => {
    if (query.trim().length < 2) {
      toast.error('Enter at least 2 characters to search');
      return;
    }
    try {
      setSearching(true);
      const response = await studentService.searchRoommateOptions({
        q: query.trim(),
        limit: 20,
      });
      setResults(response.data.data.options || []);
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to search roommate options';
      toast.error(message);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Save selected candidate as preferred roommate.
   * @param {string} roommateId - Student._id of chosen roommate
   */
  const handleSavePreference = async (roommateId) => {
    if (!roommateId) {
      toast.error('Please select a roommate option first');
      return;
    }
    try {
      setSaving(true);
      const response = await studentService.updateRoomPreference({
        preferred_roommate_id: roommateId,
      });
      setCurrentPreference(response.data.data.preference);
      setSelectedCandidate(null);
      setResults([]);
      setQuery('');
      toast.success('Room preference saved successfully');
      // Reload "who chose me" in case mutual status changed
      loadAll();
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to save room preference';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Accept a student who chose me.
   * This sets MY preference to THEM, creating a mutual pair.
   * @param {object} student - Student who chose me
   */
  const handleAcceptRequest = async (student) => {
    try {
      setSaving(true);
      const response = await studentService.updateRoomPreference({
        preferred_roommate_id: student._id,
      });
      setCurrentPreference(response.data.data.preference);

      toast.success(
        `You and ${student.name} are now a mutual pair! 🎉`,
        { duration: 5000 }
      );

      // Reload everything to reflect new mutual status
      loadAll();
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to accept preference';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Clear current preference.
   */
  const handleClearPreference = async () => {
    try {
      setSaving(true);
      const response = await studentService.updateRoomPreference({
        preferred_roommate_id: null,
      });
      setCurrentPreference(response.data.data.preference);
      setSelectedCandidate(null);
      toast.success('Room preference cleared');
      loadAll();
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to clear room preference';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // ---- Loading skeleton ----
  if (loadingPreference) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Room Preference</h1>
        <Card className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Room Preference</h1>
      </div>

      {/* ======== INFO CARD ======== */}
      <Card className="p-5 glass-card border-primary/20">
        <div className="flex items-start gap-3">
          <HeartHandshake className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h2 className="font-semibold text-foreground mb-1">
              Preferred Roommate System
            </h2>
            <p className="text-sm text-muted-foreground">
              Select one preferred roommate. When both students select each
              other, a <strong className="text-foreground">mutual pair</strong>{' '}
              is formed and prioritized during allocation. You can also accept
              requests from students who chose you.
            </p>
          </div>
        </div>
      </Card>

      {/* ======== WHO CHOSE ME SECTION ======== */}
      {/* 
        Show this section ONLY if there are students who chose me
        AND I haven't already formed a mutual pair.
        If mutual pair exists, no need to show pending requests.
      */}
      {!loadingChoseMe && whoChoseMe.length > 0 && !currentPreference?.is_mutual && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 glass-card border-emerald-500/30 bg-emerald-500/5">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  Students Who Chose You
                  <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full font-bold">
                    {whoChoseMe.length}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Accepting a request sets them as your preference — creating a
                  mutual pair.
                </p>
              </div>
            </div>

            {/* List of students who chose me */}
            <div className="space-y-3">
              {whoChoseMe.map((student, index) => {
                // Check if this person is already my current preference
                const isMyCurrentChoice =
                  currentPreference?.preferred_roommate?._id?.toString() ===
                  student._id?.toString();

                return (
                  <motion.div
                    key={student._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`
                      flex items-center justify-between gap-4 p-4 rounded-xl border-2 transition-all
                      ${isMyCurrentChoice
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-emerald-500/20 bg-background hover:border-emerald-500/40'
                      }
                    `}
                  >
                    {/* Student info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0">
                        {student.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">
                            {student.name}
                          </p>
                          {isMyCurrentChoice && (
                            <Badge status="success">
                              Your current choice ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.branch || 'No branch'} •{' '}
                          {student.year ? `Year ${student.year}` : ''}
                          {student.college_id && ` • PRN: ${student.college_id}`}
                        </p>
                      </div>
                    </div>

                    {/* Accept button */}
                    <div className="shrink-0">
                      {isMyCurrentChoice ? (
                        // Already chosen them — show mutual indicator
                        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Mutual
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAcceptRequest(student)}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                        >
                          <UserCheck className="w-4 h-4" />
                          Accept
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Loading skeleton for "who chose me" */}
      {loadingChoseMe && (
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </Card>
      )}

      {/* ======== MY CURRENT PREFERENCE ======== */}
      <Card className="p-6 glass-card">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-primary" />
          My Current Preference
        </h2>

        {currentPreference?.preferred_roommate ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
              rounded-xl p-5 border-2
              ${currentPreference.is_mutual
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-primary/20 bg-primary/5'
              }
            `}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Roommate details */}
              <div className="flex items-center gap-3">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg
                  ${currentPreference.is_mutual
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }
                `}>
                  {currentPreference.preferred_roommate.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">
                    {currentPreference.preferred_roommate.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentPreference.preferred_roommate.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentPreference.preferred_roommate.branch || 'No branch'}{' '}
                    {currentPreference.preferred_roommate.year &&
                      `• Year ${currentPreference.preferred_roommate.year}`}
                    {currentPreference.preferred_roommate.college_id &&
                      ` • PRN: ${currentPreference.preferred_roommate.college_id}`}
                  </p>
                </div>
              </div>

              {/* Status + actions */}
              <div className="flex flex-col items-end gap-3">
                {/* Mutual/One-way badge */}
                {currentPreference.is_mutual ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full font-medium text-sm shadow-lg shadow-emerald-500/30"
                  >
                    <Sparkles className="w-4 h-4" />
                    Mutual Pair Formed!
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-sm border border-amber-500/20">
                    <ArrowRight className="w-3.5 h-3.5" />
                    Waiting for them to accept
                  </div>
                )}

                {/* Clear preference button */}
                <button
                  onClick={handleClearPreference}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Preference
                </button>
              </div>
            </div>

            {/* Mutual pair explanation */}
            {currentPreference.is_mutual && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-emerald-500/20"
              >
                <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  Both of you have selected each other. During preference-based
                  allocation, you will be prioritized to share a room together.
                </p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <EmptyState
            icon={Users}
            title="No preferred roommate selected"
            description="Search and select a student below, or accept a request from someone who chose you."
          />
        )}
      </Card>

      {/* ======== SEARCH FOR NEW ROOMMATE ======== */}
      <Card className="p-6 glass-card">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Search Roommate
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 mb-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, PRN, email, or branch..."
              className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 shadow-lg shadow-primary/25 transition-all"
          >
            {searching ? 'Searching...' : 'Search'}
          </motion.button>
        </div>
        <p className="text-xs text-muted-foreground">
          Only same-gender active hosteller students are shown.
        </p>
      </Card>

      {/* ======== SEARCH RESULTS ======== */}
      {results.length > 0 && (
        <Card className="p-6 glass-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Search Results ({results.length})
          </h2>
          <div className="space-y-3">
            {results.map((student) => {
              const isSelected = selectedCandidate?._id === student._id;
              return (
                <motion.button
                  key={student._id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedCandidate(student)}
                  className={`
                    w-full text-left border-2 rounded-xl p-4 transition-all
                    ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 bg-background'
                    }
                  `}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {student.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.branch || 'No branch'} •{' '}
                          {student.year ? `Year ${student.year}` : '-'}
                          {student.college_id && ` • PRN: ${student.college_id}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {/* Has selected you badge */}
                      {student.has_selected_you && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          Chose you
                        </span>
                      )}
                      {/* Allocation status */}
                      {student.is_allocated ? (
                        <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                          Already allocated
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">
                          Unallocated
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}

            {/* Save button */}
            <div className="flex justify-end pt-2 border-t border-border">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSavePreference(selectedCandidate?._id)}
                disabled={!selectedCandidate || saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Save className="w-4 h-4" />
                {saving
                  ? 'Saving...'
                  : selectedCandidate
                  ? `Choose ${selectedCandidate.name.split(' ')[0]}`
                  : 'Save Preference'}
              </motion.button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty search state */}
      {results.length === 0 && query && !searching && (
        <Card className="p-8 glass-card">
          <EmptyState
            icon={Search}
            title="No results found"
            description={`No students match "${query}". Try a different name or PRN.`}
          />
        </Card>
      )}
    </div>
  );
};

export default RoomPreference;