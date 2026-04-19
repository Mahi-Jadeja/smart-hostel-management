/**
 * EmptyState - Shown when a list/table has no data
 *
 * Usage:
 *   <EmptyState
 *     icon={FileText}
 *     title="No complaints yet"
 *     description="You haven't filed any complaints."
 *     action={{ label: "File Complaint", onClick: handleClick }}
 *   />
 */
const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}

      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>

      {description && (
        <p className="text-gray-500 text-sm max-w-sm mb-4">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
