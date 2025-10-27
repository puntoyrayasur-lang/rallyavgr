import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import CategoryButtons from './components/CategoryButtons';
import ResultsTable from './components/ResultsTable';
import { supabase, getTiemposRally, getRallies, getPruebas } from './supabase';

// Datos de prueba simulados
const mockData = {
  rallies: ['Rally San Martín 2024', 'Rally Cordoba 2024', 'Rally Mendoza 2024'],
  pruebas: ['Prueba 1', 'Prueba 2', 'Prueba 3', 'Prueba 4', 'Prueba 5', 'Prueba 6', 'Prueba 7', 'Prueba 8'],
  dias: ['Día 1', 'Día 2'],
  categorias: ['General', 'Clase 1', 'Clase 2', 'Clase 3', 'Clase 4'],
  
  resultados: {
    'General': {
      'Prueba 1': [
        { auto: 1, piloto: 'Juan Pérez', navegante: 'María García', tiempo: '00:01:23.456', diferencia: null },
        { auto: 2, piloto: 'Carlos López', navegante: 'Ana Martínez', tiempo: '00:01:25.123', diferencia: '+00:00:01.667' },
        { auto: 3, piloto: 'Miguel Torres', navegante: 'Laura Sánchez', tiempo: '00:01:27.890', diferencia: '+00:00:04.434' },
        { auto: 4, piloto: 'Pedro Ramírez', navegante: 'Carmen Díaz', tiempo: '00:01:30.234', diferencia: '+00:00:06.778' },
        { auto: 5, piloto: 'Luis Fernández', navegante: 'Isabel Ruiz', tiempo: '00:01:32.567', diferencia: '+00:00:09.111' }
      ],
      'Prueba 2': [
        { auto: 2, piloto: 'Carlos López', navegante: 'Ana Martínez', tiempo: '00:01:20.123', diferencia: null },
        { auto: 1, piloto: 'Juan Pérez', navegante: 'María García', tiempo: '00:01:22.456', diferencia: '+00:00:02.333' },
        { auto: 3, piloto: 'Miguel Torres', navegante: 'Laura Sánchez', tiempo: '00:01:25.789', diferencia: '+00:00:05.666' },
        { auto: 4, piloto: 'Pedro Ramírez', navegante: 'Carmen Díaz', tiempo: '00:01:28.012', diferencia: '+00:00:07.889' },
        { auto: 5, piloto: 'Luis Fernández', navegante: 'Isabel Ruiz', tiempo: '00:01:30.345', diferencia: '+00:00:10.222' }
      ]
    },
    'Clase 1': {
      'Prueba 1': [
        { auto: 1, piloto: 'Juan Pérez', navegante: 'María García', tiempo: '00:01:23.456', diferencia: null },
        { auto: 3, piloto: 'Miguel Torres', navegante: 'Laura Sánchez', tiempo: '00:01:27.890', diferencia: '+00:00:04.434' }
      ],
      'Prueba 2': [
        { auto: 1, piloto: 'Juan Pérez', navegante: 'María García', tiempo: '00:01:22.456', diferencia: null },
        { auto: 3, piloto: 'Miguel Torres', navegante: 'Laura Sánchez', tiempo: '00:01:25.789', diferencia: '+00:00:03.333' }
      ]
    },
    'Clase 2': {
      'Prueba 1': [
        { auto: 2, piloto: 'Carlos López', navegante: 'Ana Martínez', tiempo: '00:01:25.123', diferencia: null },
        { auto: 4, piloto: 'Pedro Ramírez', navegante: 'Carmen Díaz', tiempo: '00:01:30.234', diferencia: '+00:00:05.111' }
      ],
      'Prueba 2': [
        { auto: 2, piloto: 'Carlos López', navegante: 'Ana Martínez', tiempo: '00:01:20.123', diferencia: null },
        { auto: 4, piloto: 'Pedro Ramírez', navegante: 'Carmen Díaz', tiempo: '00:01:28.012', diferencia: '+00:00:07.889' }
      ]
    }
  },
  
  // Clasificación general acumulada
  clasificacionGeneral: {
    'General': [
      { auto: 1, piloto: 'Juan Pérez', navegante: 'María García', tiempo: '00:02:45.912', diferencia: null, puntos: 25 },
      { auto: 2, piloto: 'Carlos López', navegante: 'Ana Martínez', tiempo: '00:02:45.246', diferencia: '-00:00:00.666', puntos: 20 },
      { auto: 3, piloto: 'Miguel Torres', navegante: 'Laura Sánchez', tiempo: '00:02:53.679', diferencia: '+00:00:07.767', puntos: 16 },
      { auto: 4, piloto: 'Pedro Ramírez', navegante: 'Carmen Díaz', tiempo: '00:02:58.246', diferencia: '+00:00:12.334', puntos: 13 },
      { auto: 5, piloto: 'Luis Fernández', navegante: 'Isabel Ruiz', tiempo: '00:03:02.912', diferencia: '+00:00:17.000', puntos: 11 }
    ],
    'Clase 1': [
      { auto: 1, piloto: 'Juan Pérez', navegante: 'María García', tiempo: '00:02:45.912', diferencia: null, puntos: 25 },
      { auto: 3, piloto: 'Miguel Torres', navegante: 'Laura Sánchez', tiempo: '00:02:53.679', diferencia: '+00:00:07.767', puntos: 20 }
    ],
    'Clase 2': [
      { auto: 2, piloto: 'Carlos López', navegante: 'Ana Martínez', tiempo: '00:02:45.246', diferencia: null, puntos: 25 },
      { auto: 4, piloto: 'Pedro Ramírez', navegante: 'Carmen Díaz', tiempo: '00:02:58.246', diferencia: '+00:00:13.000', puntos: 20 }
    ]
  }
};

function App() {
  const [rallies, setRallies] = useState([]);
  const [pruebas, setPruebas] = useState([]);
  const [tiempos, setTiempos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentRallyIndex, setCurrentRallyIndex] = useState(0);
  const [selectedPrueba, setSelectedPrueba] = useState('Prueba 1');
  const [selectedDia, setSelectedDia] = useState('Día 1');
  const [selectedCategory, setSelectedCategory] = useState('General');

  const currentRally = rallies[currentRallyIndex] || 'Cargando...';

  // Cargar datos de Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar rallies
        const ralliesData = await getRallies();
        setRallies(ralliesData);
        
        // Cargar pruebas
        const pruebasData = await getPruebas();
        setPruebas(pruebasData);
        
        // Cargar tiempos
        const tiemposData = await getTiemposRally();
        setTiempos(tiemposData);
        
        console.log('Datos cargados:', { rallies: ralliesData, pruebas: pruebasData, tiempos: tiemposData });
        
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error cargando datos desde Supabase');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Función para manejar cambio de rally
  const handleRallyChange = (direction) => {
    if (direction === 'prev') {
      setCurrentRallyIndex(prev => 
        prev === 0 ? rallies.length - 1 : prev - 1
      );
    } else {
      setCurrentRallyIndex(prev => 
        prev === rallies.length - 1 ? 0 : prev + 1
      );
    }
  };

  // Obtener datos actuales basados en la selección
  const getCurrentData = () => {
    if (loading || !tiempos.length) {
      return { prueba: [], general: [] };
    }

    const rallyActual = rallies[currentRallyIndex];
    if (!rallyActual) {
      return { prueba: [], general: [] };
    }

    // Filtrar tiempos por rally y prueba
    const tiemposFiltrados = tiempos.filter(tiempo => 
      tiempo.nombre_rally === rallyActual && 
      tiempo.prueba === selectedPrueba
    );

    // Convertir a formato para la tabla
    const datosTabla = tiemposFiltrados.map((tiempo, index) => ({
      auto: tiempo.numero_auto,
      piloto: tiempo.piloto || `Piloto ${tiempo.numero_auto}`,
      navegante: tiempo.navegante || `Navegante ${tiempo.numero_auto}`,
      clase: tiempo.clase || 'General',
      auto_modelo: tiempo.auto_modelo || `Auto ${tiempo.numero_auto}`,
      tiempo: tiempo.tiempo_transcurrido || '00:00:00.000',
      diferencia: index === 0 ? null : `+${tiempo.tiempo_transcurrido || '00:00:00.000'}`,
      puntos: Math.max(25 - index, 0) // Sistema de puntos simple
    }));

    return {
      prueba: datosTabla,
      general: datosTabla // Por ahora igual, se puede mejorar
    };
  };

  const currentData = getCurrentData();

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Cargando datos del rally...</p>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        currentRally={currentRally}
        onRallyChange={handleRallyChange}
        selectedPrueba={selectedPrueba}
        onPruebaChange={setSelectedPrueba}
        selectedDia={selectedDia}
        onDiaChange={setSelectedDia}
        pruebas={pruebas}
        dias={['Día 1', 'Día 2']} // Por ahora fijo
      />

      {/* Botones de categorías */}
      <CategoryButtons
        categories={['General', 'Clase 1', 'Clase 2', 'Clase 3', 'Clase 4']}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${selectedPrueba}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Columna izquierda - Tiempo por Prueba */}
            <ResultsTable
              title={`Tiempo ${selectedPrueba} de la ${selectedCategory}`}
              data={currentData.prueba}
              type="prueba"
            />

            {/* Columna derecha - Tiempos Generales */}
            <ResultsTable
              title={`Tiempos Generales de la ${selectedCategory}`}
              data={currentData.general}
              type="general"
            />
          </motion.div>
        </AnimatePresence>

        {/* Información adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Rally</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Rally:</span>
              <span className="ml-2 text-gray-900">{currentRally}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Prueba:</span>
              <span className="ml-2 text-gray-900">{selectedPrueba}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Día:</span>
              <span className="ml-2 text-gray-900">{selectedDia}</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default App;
