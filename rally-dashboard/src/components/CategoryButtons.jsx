import React from 'react';
import { motion } from 'framer-motion';

const CategoryButtons = ({ categories, selectedCategory, onCategorySelect }) => {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white shadow-sm border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((category, index) => (
            <motion.button
              key={category}
              onClick={() => onCategorySelect(category)}
              className={`btn-category ${selectedCategory === category ? 'active' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1 
              }}
            >
              {category}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default CategoryButtons;
