import { useState, useEffect } from 'react';
import { User, BookOpen, Building2, Shield, Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import studentService from '../../services/student.service';
import toast from 'react-hot-toast';
import { BRANCHES, STUDENT_GENDERS } from '../../constants/enums';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    dob: '',
    college_id: '',
    branch: '',
    year: 1,
    semester: 1,
    guardian: {
      name: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await studentService.getProfile();
        const data = response.data.data.student;

        setProfile(data);

        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          gender: data.gender || '',
          dob: data.dob ? data.dob.split('T')[0] : '',
          college_id: data.college_id || '',
          branch: data.branch || '',
          year: data.year || 1,
          semester: data.semester || 1,
          guardian: {
            name: data.guardian?.name || '',
            phone: data.guardian?.phone || '',
            email: data.guardian?.email || '',
          },
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('guardian.')) {
      const field = name.split('.')[1];

      setFormData((prev) => ({
        ...prev,
        guardian: {
          ...prev.guardian,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: parseInt(value, 10) || 1,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }

    setSaving(true);

    try {
      const updates = {};

      if (formData.name !== profile.name) updates.name = formData.name;
      if (formData.phone !== (profile.phone || '')) updates.phone = formData.phone;
      if (formData.gender !== (profile.gender || '')) updates.gender = formData.gender;
      if (formData.college_id !== (profile.college_id || '')) updates.college_id = formData.college_id;
      if (formData.branch !== (profile.branch || '')) updates.branch = formData.branch;
      if (formData.year !== profile.year) updates.year = formData.year;
      if (formData.semester !== profile.semester) updates.semester = formData.semester;

      const originalDob = profile.dob ? profile.dob.split('T')[0] : '';
      if (formData.dob !== originalDob) updates.dob = formData.dob;

      const guardianChanged =
        formData.guardian.name !== (profile.guardian?.name || '') ||
        formData.guardian.phone !== (profile.guardian?.phone || '') ||
        formData.guardian.email !== (profile.guardian?.email || '');

      if (guardianChanged) {
        updates.guardian = formData.guardian;
      }

      if (Object.keys(updates).length === 0) {
        toast('No changes to save', { icon: 'ℹ️' });
        setSaving(false);
        return;
      }

      const response = await studentService.updateProfile(updates);

      setProfile(response.data.data.student);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
        <Card className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ======== PERSONAL DETAILS ======== */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Personal Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              >
                <option value="">Select Gender</option>
                {STUDENT_GENDERS.map((gender) => (
                  <option key={gender.value} value={gender.value}>
                    {gender.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
        </Card>

        {/* ======== ACADEMIC DETAILS ======== */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Academic Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="college_id" className="block text-sm font-medium text-gray-700 mb-1">
                College ID / PRN
              </label>
              <input
                id="college_id"
                name="college_id"
                type="text"
                value={formData.college_id}
                onChange={handleChange}
                placeholder="Enter your PRN or roll number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
                Branch / Department
              </label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              >
                <option value="">Select Branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              >
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                Semester
              </label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* ======== HOSTEL DETAILS ======== */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Hostel Details
            </h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              Managed by Admin
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Block', value: profile?.hostel_block || 'Not assigned' },
              { label: 'Room No', value: profile?.room_no || 'Not assigned' },
              { label: 'Floor', value: profile?.floor ?? 'Not assigned' },
              { label: 'Bed No', value: profile?.bed_no ?? 'Not assigned' },
            ].map((item) => (
              <div key={item.label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {item.label}
                </label>
                <input
                  type="text"
                  value={item.value}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* ======== GUARDIAN DETAILS ======== */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Guardian Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="guardian.name" className="block text-sm font-medium text-gray-700 mb-1">
                Guardian Name
              </label>
              <input
                id="guardian.name"
                name="guardian.name"
                type="text"
                value={formData.guardian.name}
                onChange={handleChange}
                placeholder="Enter guardian's name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="guardian.phone" className="block text-sm font-medium text-gray-700 mb-1">
                Guardian Phone
              </label>
              <input
                id="guardian.phone"
                name="guardian.phone"
                type="tel"
                value={formData.guardian.phone}
                onChange={handleChange}
                placeholder="Enter guardian's phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="guardian.email" className="block text-sm font-medium text-gray-700 mb-1">
                Guardian Email
              </label>
              <input
                id="guardian.email"
                name="guardian.email"
                type="email"
                value={formData.guardian.email}
                onChange={handleChange}
                placeholder="Enter guardian's email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
              <p className="text-xs text-gray-400 mt-1">
                Used for outpass approval and payment reminders
              </p>
            </div>
          </div>
        </Card>

        {/* ======== SAVE BUTTON ======== */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
