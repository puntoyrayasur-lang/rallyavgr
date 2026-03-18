// JavaScript específico para la página pública (index.html)
// Versión simplificada y robusta

console.log('=== INICIANDO PUBLIC.JS ===');

// Configuración de Supabase
const SUPABASE_URL = 'https://heelfndrqcpbobpnqaou.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZWxmbmRycWNwYm9icG5xYW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MzcxMzEsImV4cCI6MjA4OTQxMzEzMX0.puRFDQwAH-b1v7jRfRI7q_L5tUDLA9_qavI43C2aBns';

// Inicializar cliente de Supabase
let supabase;
try {
    console.log('🔍 Verificando disponibilidad de Supabase...');
    console.log('window.supabase disponible:', !!window.supabase);
    
    if (!window.supabase) {
        throw new Error('SDK de Supabase no está disponible');
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Cliente Supabase inicializado correctamente');
    console.log('URL:', SUPABASE_URL);
    console.log('Key:', SUPABASE_KEY.substring(0, 20) + '...');
} catch (error) {
    console.error('❌ Error inicializando Supabase:', error);
    console.error('Detalles:', error.message);
}

// Variables globales
let allTiempos = [];
let filteredPrueba = null;

// Función principal para cargar datos
async function loadData() {
    console.log('=== INICIANDO CARGA DE DATOS ===');
    console.log('🔍 Verificando estado de Supabase...');
    console.log('Cliente supabase:', !!supabase);
    
    // Verificar que Supabase esté inicializado
    if (!supabase) {
        console.error('❌ Error: Cliente Supabase no inicializado');
        alert('Error: No se pudo conectar con la base de datos');
        return;
    }
    
    console.log('✅ Cliente Supabase verificado');
    
    try {
        console.log('1. Conectando a Supabase...');
        const { data: tiempos, error } = await supabase
            .from('tiempos_rally')
            .select('*')
            .order('tiempo_segundos', { ascending: true });

        if (error) {
            throw error;
        }

        allTiempos = tiempos || [];
        console.log('2. Datos obtenidos:', allTiempos.length, 'registros');

        // Mostrar datos primero
        displayData();
        
        // Actualizar filtro de pruebas después
        updatePruebaFilter();
        
        console.log('=== CARGA COMPLETADA ===');
        
    } catch (error) {
        console.error('ERROR EN CARGA:', error);
        console.error('Detalles del error:', error.message, error.code);
        alert('Error cargando datos: ' + error.message);
        
        // Mostrar mensaje de error en la página
        const container = document.getElementById('pruebas-container');
        if (container) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #ff4444;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Error de conexión</h4>
                    <p>No se pudieron cargar los datos: ${error.message}</p>
                    <button onclick="loadData()" style="margin-top: 10px; padding: 10px 20px; background: #cc0000; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-retry"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }
}

// Función para mostrar los datos
function displayData() {
    console.log('=== MOSTRANDO DATOS ===');
    console.log('Registros disponibles:', allTiempos.length);
    
    const container = document.getElementById('pruebas-container');
    if (!container) {
        console.error('❌ No se encontró el contenedor');
        return;
    }

    // Si no hay datos, mostrar mensaje
    if (allTiempos.length === 0) {
        console.log('📭 Sin datos - mostrando mensaje vacío');
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #ccc; background: #2a2a2a; border-radius: 10px; margin: 20px 0;">
                <i class="fas fa-info-circle" style="font-size: 3em; margin-bottom: 20px; color: #666;"></i>
                <h3 style="color: #999; margin-bottom: 10px;">No hay tiempos registrados</h3>
                <p style="color: #777;">Los tiempos aparecerán aquí cuando se registren en el sistema</p>
            </div>
        `;
        return;
    }

    // Agrupar por prueba
    const pruebas = {};
    allTiempos.forEach(tiempo => {
        const prueba = tiempo.prueba || 'Sin prueba';
        if (!pruebas[prueba]) {
            pruebas[prueba] = [];
        }
        pruebas[prueba].push(tiempo);
    });

    console.log('📊 Pruebas encontradas:', Object.keys(pruebas));

    // Crear HTML de las tablas
        let html = '';
    Object.keys(pruebas).sort().forEach(prueba => {
            const tiemposPrueba = pruebas[prueba];
            
            // Ordenar por tiempo
            tiemposPrueba.sort((a, b) => {
                const tiempoA = parseFloat(a.tiempo_segundos) || 999999;
                const tiempoB = parseFloat(b.tiempo_segundos) || 999999;
                return tiempoA - tiempoB;
            });
            
            html += `
            <div class="prueba-section" style="margin-bottom: 30px; background: #2a2a2a; border-radius: 15px; overflow: hidden; border: 1px solid #444;">
                <div class="prueba-header" style="background: linear-gradient(135deg, #cc0000, #aa0000); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0; font-size: 1.2em; font-weight: 600;">
                        <i class="fas fa-flag" style="margin-right: 10px;"></i>
                        ${prueba}
                    </h4>
                    <span style="background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; font-size: 0.9em;">
                        ${tiemposPrueba.length} autos
                    </span>
                    </div>
                <div class="table-container" style="overflow-x: auto;">
                    <table class="results-table" style="width: 100%; border-collapse: collapse;">
                            <thead>
                            <tr style="background: #333;">
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-medal" style="margin-right: 5px;"></i>Pos
                                </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-car" style="margin-right: 5px;"></i>Auto
                                </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-user" style="margin-right: 5px;"></i>Piloto
                                </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-user-friends" style="margin-right: 5px;"></i>Navegante
                                    </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-tag" style="margin-right: 5px;"></i>Clase
                                    </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-stopwatch" style="margin-right: 5px;"></i>Tiempo
                                    </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-flag-checkered" style="margin-right: 5px;"></i>Largada
                                    </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-flag" style="margin-right: 5px;"></i>Llegada
                                    </th>
                                <th style="padding: 12px 8px; text-align: center; color: #fff; border-bottom: 2px solid #cc0000;">
                                    <i class="fas fa-calendar" style="margin-right: 5px;"></i>Fecha
                                    </th>
                                </tr>
                            </thead>
                        <tbody>
        `;
        
        // Obtener datos de autos desde localStorage
        const autosInfo = JSON.parse(localStorage.getItem('autos_info') || '{}');
        console.log('📊 Datos de autos desde localStorage:', autosInfo);
        console.log('📊 Claves disponibles en autosInfo:', Object.keys(autosInfo));
        
        // Mostrar todos los números de auto que vienen de la base de datos
        const numerosAuto = tiemposPrueba.map(t => t.numero_auto);
        console.log('📊 Números de auto desde BD:', numerosAuto);
            
            tiemposPrueba.forEach((tiempo, index) => {
            const isWinner = index === 0;
            const isPodium = index < 3;
            const rowStyle = isWinner ? 'background: rgba(255,215,0,0.1); border-left: 4px solid #ffd700;' : 
                             isPodium ? 'background: rgba(192,192,192,0.05); border-left: 4px solid #c0c0c0;' : '';
            
            console.log(`🔍 Procesando auto ${tiempo.numero_auto} (tipo: ${typeof tiempo.numero_auto})`);
            
            // Convertir el número a string para asegurar coincidencia
            const numeroAutoStr = String(tiempo.numero_auto);
            const autoInfo = autosInfo[numeroAutoStr] || {};
            
            console.log(`🔍 Buscando info para auto "${numeroAutoStr}" en:`, Object.keys(autosInfo));
            console.log(`🔍 Info encontrada para auto ${numeroAutoStr}:`, autoInfo);
            console.log(`🔍 ¿Tiene piloto?`, autoInfo.piloto ? 'SÍ' : 'NO');
            console.log(`🔍 ¿Tiene navegante?`, autoInfo.navegante ? 'SÍ' : 'NO');
            
                html += `
                <tr style="${rowStyle} transition: all 0.3s ease;" onmouseover="this.style.background='rgba(204,0,0,0.1)'" onmouseout="this.style.background='${rowStyle}'">
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444;">
                            ${getPositionHTML(index + 1)}
                        </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444;">
                        <span style="background: linear-gradient(135deg, #cc0000, #aa0000); color: white; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 1.1em;">
                            ${tiempo.numero_auto || 'N/A'}
                        </span>
                    </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444; color: #fff; font-weight: 500;">
                        ${autoInfo.piloto || '-'}
                    </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444; color: #fff; font-weight: 500;">
                        ${autoInfo.navegante || '-'}
                    </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444; color: #ffcc00; font-weight: 600;">
                        ${autoInfo.clase || '-'}
                        </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444;">
                        <span style="color: #00cc00; font-weight: bold; font-family: 'Courier New', monospace; font-size: 1.2em;">
                            ${tiempo.tiempo_transcurrido || 'N/A'}
                        </span>
                        </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444; font-family: 'Courier New', monospace;">
                        ${tiempo.hora_largada || 'N/A'}
                        </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444; font-family: 'Courier New', monospace;">
                        ${tiempo.hora_llegada || 'N/A'}
                        </td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #444; color: #ccc;">
                        ${tiempo.fecha || 'N/A'}
                        </td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

    // Insertar HTML en el contenedor
        container.innerHTML = html;
    console.log('✅ Tablas creadas y mostradas');
    console.log('📏 HTML insertado, longitud:', html.length);

    // Actualizar contador
    const countElement = document.getElementById('results-count-by-prueba');
    if (countElement) {
        countElement.textContent = `${Object.keys(pruebas).length} pruebas`;
    }

    console.log('🎯 displayData() COMPLETADO');
}

// Animación de filas
function animateRows() {
    const rows = document.querySelectorAll('.results-table tbody tr');
    rows.forEach((row, index) => {
        row.style.opacity = 0;
        row.style.transform = 'translateY(20px)';
        setTimeout(() => {
            row.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            row.style.opacity = 1;
            row.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Actualizar filtro de pruebas
function updatePruebaFilter() {
    console.log('=== ACTUALIZANDO FILTRO DE PRUEBAS ===');
    const pruebaSelect = document.getElementById('prueba-filter-select');
    if (!pruebaSelect) {
        console.error('No se encontró el select de pruebas');
        return;
    }
    
    console.log('Datos disponibles para filtro:', allTiempos.length);
    
    // Obtener pruebas únicas de todos los datos
    const pruebas = [...new Set(allTiempos.map(t => t.prueba))].sort((a, b) => {
        // Ordenar por número de prueba si es posible
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });
    
    console.log('Pruebas encontradas:', pruebas);
    
    // Limpiar y actualizar select de pruebas
    pruebaSelect.innerHTML = '<option value="">Todas las pruebas</option>';
    pruebas.forEach(prueba => {
        const option = document.createElement('option');
        option.value = prueba;
        option.textContent = prueba;
        pruebaSelect.appendChild(option);
    });
    
    console.log('Filtro de pruebas actualizado:', pruebas.length, 'opciones');
    console.log('=== FILTRO ACTUALIZADO ===');
}

// Obtener HTML para posición
function getPositionHTML(position) {
    if (position === 1) {
        return `
            <div class="position-medal gold">
                <i class="fas fa-medal"></i>
                <span class="position-number">1º</span>
            </div>
        `;
    } else if (position === 2) {
        return `
            <div class="position-medal silver">
                <i class="fas fa-medal"></i>
                <span class="position-number">2º</span>
            </div>
        `;
    } else if (position === 3) {
        return `
            <div class="position-medal bronze">
                <i class="fas fa-medal"></i>
                <span class="position-number">3º</span>
            </div>
        `;
    } else {
        return `<span class="position-number">${position}º</span>`;
    }
}

// Función para recargar (llamada por el botón)
function loadTiemposByPrueba() {
    console.log('=== RECARGA MANUAL ===');
    loadData();
}

// Función para filtrar
function filterPruebas() {
    const pruebaSelect = document.getElementById('prueba-filter-select');
    filteredPrueba = pruebaSelect.value;
    displayData();
}

// Función para mostrar todas
function showAllPruebas() {
    filteredPrueba = null;
    document.getElementById('prueba-filter-select').value = '';
    displayData();
}

// Función para mostrar seleccionada
function showSelectedPrueba() {
    const pruebaSelect = document.getElementById('prueba-filter-select');
    filteredPrueba = pruebaSelect.value;
    if (filteredPrueba) {
        displayData();
    } else {
        alert('Selecciona una prueba primero');
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CARGADO ===');
    console.log('🚀 Iniciando carga de datos...');
    
    // Cargar datos inmediatamente
    loadData();
    
    // Verificar que el contenido persista después de 3 segundos
    setTimeout(() => {
        const container = document.getElementById('pruebas-container');
        if (container) {
            console.log('🔍 Verificación después de 3 segundos:');
            console.log('- Contenido del container:', container.innerHTML.length, 'caracteres');
            console.log('- ¿Está vacío?', container.innerHTML.trim() === '');
        }
    }, 3000);
});


console.log('=== PUBLIC.JS CARGADO ===');