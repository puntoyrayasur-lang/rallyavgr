import React from 'react';
import { motion } from 'framer-motion';

const Header = ({ 
  currentRally, 
  onRallyChange, 
  selectedPrueba, 
  onPruebaChange, 
  selectedDia, 
  onDiaChange,
  pruebas,
  dias 
}) => {
  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white shadow-lg border-b border-gray-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 flex-wrap gap-4">
          {/* Navegación izquierda */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => onRallyChange('prev')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-label="Rally anterior"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={() => onRallyChange('next')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-label="Rally siguiente"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Logo central */}
          <div className="flex-shrink-0 flex-1 min-w-0">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-rally-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{currentRally}</h1>
                <p className="text-sm text-gray-500">Dashboard de Tiempos</p>
              </div>
            </motion.div>
          </div>

          {/* Dropdowns derecha */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <label htmlFor="prueba-select" className="text-sm font-medium text-gray-700 hidden sm:block">
                Prueba:
              </label>
              <select
                id="prueba-select"
                value={selectedPrueba}
                onChange={(e) => onPruebaChange(e.target.value)}
                className="px-2 sm:px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rally-primary focus:border-transparent transition-all duration-200"
              >
                {pruebas.map(prueba => (
                  <option key={prueba} value={prueba}>
                    {prueba}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="dia-select" className="text-sm font-medium text-gray-700 hidden sm:block">
                Día:
              </label>
              <select
                id="dia-select"
                value={selectedDia}
                onChange={(e) => onDiaChange(e.target.value)}
                className="px-2 sm:px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rally-primary focus:border-transparent transition-all duration-200"
              >
                {dias.map(dia => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
