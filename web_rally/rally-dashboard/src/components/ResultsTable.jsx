import React from 'react';
import { motion } from 'framer-motion';

const ResultsTable = ({ title, data, type = 'prueba' }) => {
  if (!data || data.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">
          No hay datos disponibles
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200"
    >
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="table-rally">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Auto</th>
              <th>Piloto</th>
              <th>Navegante</th>
              <th>Clase</th>
              {type === 'prueba' ? (
                <>
                  <th>Tiempo</th>
                  <th>Diferencia</th>
                </>
              ) : (
                <>
                  <th>Tiempo Total</th>
                  <th>Diferencia</th>
                  <th>Puntos</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <motion.tr
                key={item.auto}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05 
                }}
                className={index < 3 ? 'bg-yellow-50' : ''}
              >
                <td className="font-semibold">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="font-medium text-rally-primary">#{item.auto}</td>
                <td>{item.piloto}</td>
                <td>{item.navegante}</td>
                <td className="font-semibold text-blue-600">{item.clase}</td>
                <td className="font-mono font-semibold">{item.tiempo}</td>
                <td className={item.diferencia ? 'text-red-600' : 'text-gray-500'}>
                  {item.diferencia || '-'}
                </td>
                {type === 'general' && (
                  <td className="font-semibold text-rally-primary">
                    {item.puntos || 0}
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ResultsTable;
