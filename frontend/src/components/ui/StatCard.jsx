/**
 * StatCard - Dashboard stat card (number + label)
 *
 * Usage:
 *   <StatCard
 *     icon={Home}
 *     label="Room"
 *     value="A-101"
 *     subtext="Floor 1, Bed 2"
 *     color="indigo"
 *   />
 */
const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-green-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    border: 'border-yellow-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    border: 'border-red-100',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-blue-100',
  },
};

const StatCard = ({ icon: Icon, label, value, subtext, color = 'indigo' }) => {
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className={`bg-white rounded-xl border ${colors.border} p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && (
        <p className="text-sm text-gray-400 mt-1">{subtext}</p>
      )}
    </div>
  );
};

export default StatCard;
