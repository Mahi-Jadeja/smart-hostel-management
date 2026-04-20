import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const EmptyState = ({ 
  icon: Icon = FileText, 
  title, 
  description, 
  action,
  className = '' 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`
        flex flex-col items-center justify-center py-12 px-4 text-center
        glass-card rounded-xl border-dashed border-2
        ${className}
      `}
    >
      <motion.div 
        initial={{ y: 10 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4"
      >
        <Icon className="w-8 h-8 text-primary" />
      </motion.div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
      )}
      
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-lg shadow-primary/25"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};

export default EmptyState;