import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  HeartHandshake,
  Save,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import studentService from '../../services/student.service';
import toast from 'react-hot-toast';

const RoomPreference = () => {
  const [currentPreference, setCurrentPreference] = useState(null);
  const [loadingPreference, setLoadingPreference] = useState(true);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadPreference = async () => {
    try {
      setLoadingPreference(true);
      const response = await studentService.getRoomPreference();
      setCurrentPreference(response.data.data.preference);
    } catch (error) {
      console.error('Failed to load room preference:', error);
      toast.error('Failed to load room preference');
    } finally {
      setLoadingPreference(false);
    }
  };

  useEffect(() => {
    loadPreference();
  }, []);

  const handleSearch = async () => {
    if (query.trim().length < 2) {
      toast.error('Please enter at least 2 characters to search');
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
      console.error('Failed to search roommate options:', error);
      const message =
        error.response?.data?.message || 'Failed to search roommate options';
      toast.error(message);
    } finally {
      setSearching(false);
    }
  };

  const handleSavePreference = async () => {
    if (!selectedCandidate) {
      toast.error('Please select a roommate option first');
      return;
    }

    try {
      setSaving(true);

      const response = await studentService.updateRoomPreference({
        preferred_roommate_id: selectedCandidate._id,
      });

      setCurrentPreference(response.data.data.preference);
      toast.success('Room preference saved successfully');
    } catch (error) {
      console.error('Failed to save room preference:', error);
      const message =
        error.response?.data?.message || 'Failed to save room preference';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearPreference = async () => {
    try {
      setSaving(true);

      const response = await studentService.updateRoomPreference({
        preferred_roommate_id: null,
      });

      setCurrentPreference(response.data.data.preference);
      setSelectedCandidate(null);
      toast.success('Room preference cleared successfully');
    } catch (error) {
      console.error('Failed to clear room preference:', error);
      const message =
        error.response?.data?.message || 'Failed to clear room preference';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingPreference) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Room Preference
        </h1>
        <Card className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Room Preference
      </h1>

      {/* Info Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-3">
          <HeartHandshake className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">
              Preferred Roommate Request
            </h2>
            <p className="text-sm text-gray-600">
              You can select one preferred roommate. During preference-based
              allocation, only clean mutual pairs are honored.
            </p>
          </div>
        </div>
      </Card>

      {/* Current Preference */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Current Preference
        </h2>

        {currentPreference?.preferred_roommate ? (
          <div className="border rounded-xl p-4 bg-indigo-50 border-indigo-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">
                  {currentPreference.preferred_roommate.name}
                </p>
                <p className="text-sm text-gray-500">
                  {currentPreference.preferred_roommate.email}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {currentPreference.preferred_roommate.branch} • Year{' '}
                  {currentPreference.preferred_roommate.year || '-'}
                </p>
                {currentPreference.preferred_roommate.college_id && (
                  <p className="text-xs text-gray-400 mt-1">
                    PRN: {currentPreference.preferred_roommate.college_id}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                {currentPreference.is_mutual ? (
                  <span className="inline-flex items-center gap-1 text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                    Mutual Choice
                  </span>
                ) : (
                  <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                    Waiting for mutual selection
                  </span>
                )}

                <button
                  onClick={handleClearPreference}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Preference
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No preferred roommate selected"
            description="Search and select a student below if you want to request a preferred roommate."
          />
        )}
      </Card>

      {/* Search */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Search Roommate Options
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, PRN, email, or branch..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          Only same-gender active hosteller students are shown.
        </p>
      </Card>

      {/* Search Results */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Search Results
        </h2>

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((student) => (
              <button
                key={student._id}
                onClick={() => setSelectedCandidate(student)}
                className={`w-full text-left border rounded-xl p-4 transition-all ${
                  selectedCandidate?._id === student._id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {student.branch} • Year {student.year || '-'}
                    </p>
                    {student.college_id && (
                      <p className="text-xs text-gray-400 mt-1">
                        PRN: {student.college_id}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {student.has_selected_you && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Has selected you
                      </span>
                    )}

                    {student.is_allocated ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                        Currently allocated
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        Unallocated
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSavePreference}
                disabled={!selectedCandidate || saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Preference'}
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="No search results yet"
            description="Search for a student by name, PRN, branch, or email."
          />
        )}
      </Card>
    </div>
  );
};

export default RoomPreference;