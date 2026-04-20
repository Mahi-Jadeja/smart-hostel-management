import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, BookOpen, Building2, Shield, Save, Mail, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import studentService from '../../services/student.service';
import toast from 'react-hot-toast';
import { BRANCHES, STUDENT_GENDERS } from '../../constants/enums';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

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
    guardian: { name: '', phone: '', email: '' },
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
        guardian: { ...prev.guardian, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) || 1 }));
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
      if (guardianChanged) updates.guardian = formData.guardian;
      
      if (Object.keys(updates).length === 0) {
        toast('No changes to save', { icon: 'ℹ️' });
        setSaving(false);
        return;
      }
      const response = await studentService.updateProfile(updates);
      setProfile(response.data.data.student);
      toast.success('Profile updated successfully!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <Card className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <motion.div initial="hidden" animate="visible" variants={sectionVariants} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium shadow-lg shadow-primary/25"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <motion.div variants={sectionVariants}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Personal Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input name="name" type="text" value={formData.name} onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-lg border border-input">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{profile?.email}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                  <option value="">Select Gender</option>
                  {STUDENT_GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input name="dob" type="date" value={formData.dob} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Academic Details */}
        <motion.div variants={sectionVariants}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Academic Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>College ID / PRN</label>
                <input name="college_id" type="text" value={formData.college_id} onChange={handleChange} placeholder="Enter PRN" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Branch</label>
                <select name="branch" value={formData.branch} onChange={handleChange} className={inputClass}>
                  <option value="">Select Branch</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <select name="year" value={formData.year} onChange={handleNumberChange} className={inputClass}>
                  {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Semester</label>
                <select name="semester" value={formData.semester} onChange={handleNumberChange} className={inputClass}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Hostel Details */}
        <motion.div variants={sectionVariants}>
          <Card className="p-6 opacity-75">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Hostel Details</h2>
              <span className="ml-auto text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">Managed by Admin</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Block', value: profile?.hostel_block || 'Not assigned' },
                { label: 'Room No', value: profile?.room_no || 'Not assigned' },
                { label: 'Floor', value: profile?.floor ?? 'Not assigned' },
                { label: 'Bed No', value: profile?.bed_no ?? 'Not assigned' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Guardian Details */}
        <motion.div variants={sectionVariants}>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-rose-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Guardian Details</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Guardian Name</label>
                <input name="guardian.name" type="text" value={formData.guardian.name} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Guardian Phone</label>
                <input name="guardian.phone" type="tel" value={formData.guardian.phone} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Guardian Email</label>
                <input name="guardian.email" type="email" value={formData.guardian.email} onChange={handleChange} className={inputClass} />
                <p className="text-xs text-muted-foreground mt-1">Used for outpass approval</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default Profile;