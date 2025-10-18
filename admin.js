// JavaScript específico para la página de administración (admin.html)

// ==================== FUNCIÓN DE NOTIFICACIONES ====================
function showNotification(message, type = 'info', duration = 3000) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Agregar estilos si no existen
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background: var(--secondary-color, #2a2a2a);
                border: 1px solid var(--border-color, #444);
                border-radius: 10px;
                padding: 15px 20px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                animation: slideInRight 0.3s ease;
                max-width: 400px;
                color: #fff;
            }
            .notification-success { border-color: #28a745; }
            .notification-error { border-color: #dc3545; }
            .notification-warning { border-color: #ffc107; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-close {
                background: none;
                border: none;
                color: #ccc;
                cursor: pointer;
                padding: 5px;
                margin-left: auto;
            }
            .notification-close:hover {
                color: #fff;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    // Agregar al DOM
    document.body.appendChild(notification);

    // Auto-remover después del tiempo especificado
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Configuración de Supabase
const SUPABASE_URL = 'https://ymcfzcljdxtujgiaiqki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltY2Z6Y2xqZHh0dWpnaWFpcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDYzOTIsImV4cCI6MjA3NTUyMjM5Mn0.BsjAqaqgC64tTzNvx1HZc1exWSZEs5znLFKl2Ucp8u4';

// Inicializar cliente de Supabase
let supabaseClient;
try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Cliente de Supabase inicializado correctamente');
    } else {
        console.log('❌ window.supabase no disponible');
        supabaseClient = null;
    }
} catch (error) {
    console.error('❌ Error inicializando Supabase:', error);
    supabaseClient = null;
}

// Hacer supabaseClient globalmente disponible
window.supabaseClient = supabaseClient;

// Variables globales (sin autenticación)

// Variables globales
let autoRefreshInterval;
let refreshCount = 0;
let allTiempos = [];
let pruebas = [];
let filteredPrueba = null;

// Variables para carga de Excel
let selectedFile = null;
let extractedData = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de administración cargada');
    connectAndLoad();
    startAutoRefresh();
    setupExcelUpload();
    
    // Cargar tiempos inmediatamente
    setTimeout(() => {
        loadTiemposByPrueba();
    }, 1000);
});

// ==================== FUNCIONES DE DATOS ====================

async function connectAndLoad() {
    try {
        showNotification('Conectando a la base de datos...', 'info');
        
        // Cargar datos de la vista tiempos_rally
        const { data: tiempos, error } = await window.supabaseClient
            .from('tiempos_rally')
            .select('*')
            .order('tiempo_segundos', { ascending: true });

        if (error) {
            throw error;
        }

        allTiempos = tiempos || [];
        
        // Actualizar estadísticas
        updateStats();
        
        // Actualizar filtro de pruebas
        updatePruebaFilter();
        
        // Cargar todas las pruebas
        loadTiemposByPrueba();
        
        showNotification('Datos cargados correctamente', 'success');
        
    } catch (error) {
        console.error('Error conectando a Supabase:', error);
        showNotification('Error conectando a la base de datos: ' + error.message, 'error');
    }
}

function updateStats() {
    if (allTiempos.length === 0) {
        document.getElementById('total-registros').textContent = '0';
        document.getElementById('promedio').textContent = '-';
        document.getElementById('mejor').textContent = '-';
        return;
    }

    const tiemposConSegundos = allTiempos.filter(t => t.tiempo_segundos);
    
    let promedioTiempo = '-';
    let mejorTiempo = '-';
    
    if (tiemposConSegundos.length > 0) {
        const promedio = tiemposConSegundos.reduce((a, b) => a + parseFloat(b.tiempo_segundos), 0) / tiemposConSegundos.length;
        promedioTiempo = formatTime(promedio);
        
        const mejor = Math.min(...tiemposConSegundos.map(t => parseFloat(t.tiempo_segundos)));
        mejorTiempo = formatTime(mejor);
    }

    document.getElementById('total-registros').textContent = allTiempos.length;
    document.getElementById('promedio').textContent = promedioTiempo;
    document.getElementById('mejor').textContent = mejorTiempo;
}

function updatePruebaFilter() {
    const pruebaSelect = document.getElementById('prueba-filter-select');
    
    // Obtener pruebas únicas de todos los datos
    pruebas = [...new Set(allTiempos.map(t => t.prueba))].sort((a, b) => {
        // Ordenar por número de prueba si es posible
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });
    
    // Limpiar y actualizar select de pruebas
    pruebaSelect.innerHTML = '<option value="">Todas las pruebas</option>';
    pruebas.forEach(prueba => {
        const option = document.createElement('option');
        option.value = prueba;
        option.textContent = prueba;
        pruebaSelect.appendChild(option);
    });
    
    // Limpiar filtro
    filteredPrueba = null;
}

function filterPruebas() {
    const pruebaSelect = document.getElementById('prueba-filter-select');
    filteredPrueba = pruebaSelect.value;
    loadTiemposByPrueba();
}

function showAllPruebas() {
    filteredPrueba = null;
    document.getElementById('prueba-filter-select').value = '';
    loadTiemposByPrueba();
}

function showSelectedPrueba() {
    const pruebaSelect = document.getElementById('prueba-filter-select');
    filteredPrueba = pruebaSelect.value;
    if (filteredPrueba) {
        loadTiemposByPrueba();
    } else {
        showNotification('Selecciona una prueba primero', 'warning');
    }
}

// ==================== FUNCIONES DE PDF ====================

function setupExcelUpload() {
    const uploadArea = document.getElementById('upload-area');
    const excelInput = document.getElementById('excel-input');
    
    // Click para seleccionar archivo
    uploadArea.addEventListener('click', () => excelInput.click());
    
    // Drag & drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    
    // Cambio de archivo
    excelInput.addEventListener('change', handleFileSelect);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/excel'
    ];
    
    if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        selectedFile = file;
        showUploadActions();
        showNotification('Excel seleccionado: ' + file.name, 'success');
    } else {
        showNotification('Por favor selecciona un archivo Excel (.xlsx o .xls)', 'error');
    }
}

function showUploadActions() {
    document.getElementById('upload-actions').style.display = 'block';
}

function clearUpload() {
    selectedFile = null;
    extractedData = [];
    document.getElementById('upload-actions').style.display = 'none';
    document.getElementById('processing-status').style.display = 'none';
    document.getElementById('preview-data').style.display = 'none';
    document.getElementById('excel-input').value = '';
}

async function processExcel() {
    if (!selectedFile) return;
    
    showProcessingStatus();
    
    try {
        // Procesar archivo Excel
        extractedData = await extractDataFromExcel(selectedFile);
        
        hideProcessingStatus();
        showPreviewData();
        
    } catch (error) {
        hideProcessingStatus();
        showNotification('Error procesando Excel: ' + error.message, 'error');
    }
}

async function extractDataFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                console.log('📊 Procesando archivo Excel...');
                
                // Leer el archivo Excel
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Obtener la primera hoja
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convertir a JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                console.log('📊 Datos del Excel:', jsonData);
                
                // Procesar los datos
                const extractedData = [];
                
                // Buscar la fila de encabezados
                let headerRowIndex = -1;
                let numeroIndex = -1;
                let pilotoIndex = -1;
                let naveganteIndex = -1;
                let claseIndex = -1;
                
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row && row.length > 0) {
                        // Buscar columnas por nombre (case insensitive)
                        const rowStr = row.map(cell => String(cell).toLowerCase()).join(' ');
                        
                        if (rowStr.includes('numero') || rowStr.includes('nº') || rowStr.includes('no') || rowStr.includes('nro')) {
                            headerRowIndex = i;
                            
                            // Encontrar índices de columnas
                            row.forEach((cell, index) => {
                                const cellStr = String(cell).toLowerCase();
                                if (cellStr.includes('numero') || cellStr.includes('nº') || cellStr.includes('no') || cellStr.includes('nro')) {
                                    numeroIndex = index;
                                } else if (cellStr.includes('piloto') && cellStr.includes('navegante')) {
                                    // Columna que contiene piloto y navegante juntos
                                    pilotoIndex = index;
                                    naveganteIndex = -1; // Indica que están juntos
                                } else if (cellStr.includes('piloto') || cellStr.includes('conductor')) {
                                    pilotoIndex = index;
                                } else if (cellStr.includes('navegante') || cellStr.includes('copiloto')) {
                                    naveganteIndex = index;
                                } else if (cellStr.includes('clase') || cellStr.includes('categoria')) {
                                    claseIndex = index;
                                }
                            });
                            break;
                        }
                    }
                }
                
                console.log('📊 Encabezados encontrados en fila:', headerRowIndex);
                console.log('📊 Índices - Número:', numeroIndex, 'Piloto:', pilotoIndex, 'Navegante:', naveganteIndex, 'Clase:', claseIndex);
                
                if (headerRowIndex >= 0 && numeroIndex >= 0) {
                    // Procesar filas de datos
                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row && row[numeroIndex] && row[numeroIndex] !== '') {
                            const numero = String(row[numeroIndex]).trim();
                            
                            let piloto = '';
                            let navegante = '';
                            
                            // Si hay columnas separadas para piloto y navegante
                            if (pilotoIndex >= 0 && naveganteIndex >= 0) {
                                piloto = String(row[pilotoIndex] || '').trim();
                                navegante = String(row[naveganteIndex] || '').trim();
                            }
                            // Si solo hay una columna con piloto y navegante separados por guión
                            else if (pilotoIndex >= 0) {
                                const pilotoNavegante = String(row[pilotoIndex] || '').trim();
                                if (pilotoNavegante.includes(' - ')) {
                                    const partes = pilotoNavegante.split(' - ');
                                    piloto = partes[0].trim();
                                    navegante = partes[1].trim();
                                } else if (pilotoNavegante.includes('-')) {
                                    const partes = pilotoNavegante.split('-');
                                    piloto = partes[0].trim();
                                    navegante = partes[1].trim();
                                } else {
                                    piloto = pilotoNavegante;
                                    navegante = `Navegante ${numero}`;
                                }
                            }
                            // Si no encuentra columnas específicas, buscar en las primeras columnas
                            else {
                                // Buscar en las columnas después del número
                                for (let j = numeroIndex + 1; j < row.length; j++) {
                                    const celda = String(row[j] || '').trim();
                                    if (celda && (celda.includes(' - ') || celda.includes('-'))) {
                                        if (celda.includes(' - ')) {
                                            const partes = celda.split(' - ');
                                            piloto = partes[0].trim();
                                            navegante = partes[1].trim();
                                        } else {
                                            const partes = celda.split('-');
                                            piloto = partes[0].trim();
                                            navegante = partes[1].trim();
                                        }
                                        break;
                                    }
                                }
                            }
                            
                            const clase = claseIndex >= 0 ? String(row[claseIndex] || '').trim() : '';
                            
                            if (numero && numero !== '') {
                                const autoData = {
                                    numero: numero,
                                    piloto: piloto || `Piloto ${numero}`,
                                    navegante: navegante || `Navegante ${numero}`,
                                    clase: clase || 'N4'
                                };
                                console.log(`📊 Auto ${numero}: "${piloto}" | "${navegante}" (${clase})`);
                                extractedData.push(autoData);
                            }
                        }
                    }
                } else {
                    // Si no encuentra encabezados, usar las primeras columnas
                    console.log('📊 No se encontraron encabezados, usando primeras columnas');
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (row && row[0] && row[0] !== '') {
                            const numero = String(row[0]).trim();
                            let piloto = '';
                            let navegante = '';
                            
                            // Buscar en la segunda columna si tiene guión
                            if (row[1]) {
                                const celda = String(row[1]).trim();
                                if (celda.includes(' - ')) {
                                    const partes = celda.split(' - ');
                                    piloto = partes[0].trim();
                                    navegante = partes[1].trim();
                                } else if (celda.includes('-')) {
                                    const partes = celda.split('-');
                                    piloto = partes[0].trim();
                                    navegante = partes[1].trim();
                                } else {
                                    piloto = celda;
                                    navegante = row[2] ? String(row[2]).trim() : `Navegante ${numero}`;
                                }
                            } else {
                                piloto = `Piloto ${numero}`;
                                navegante = `Navegante ${numero}`;
                            }
                            
                            extractedData.push({
                                numero: numero,
                                piloto: piloto,
                                navegante: navegante,
                                clase: row[3] ? String(row[3]).trim() : 'N4'
                            });
                        }
                    }
                }
                
                console.log('📄 Datos extraídos del Excel:', extractedData);
                console.log('📄 Números de auto en Excel:', extractedData.map(item => item.numero));
                resolve(extractedData);
                
            } catch (error) {
                console.error('Error procesando Excel:', error);
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error leyendo el archivo'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

function showProcessingStatus() {
    document.getElementById('processing-status').style.display = 'block';
    document.getElementById('upload-actions').style.display = 'none';
}

function hideProcessingStatus() {
    document.getElementById('processing-status').style.display = 'none';
}

function showPreviewData() {
    const tbody = document.getElementById('preview-tbody');
    tbody.innerHTML = '';
    
    extractedData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.numero}</td>
            <td>${item.piloto}</td>
            <td>${item.navegante}</td>
            <td>${item.clase}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('preview-data').style.display = 'block';
}

async function saveToDatabase() {
    try {
        console.log('=== GUARDANDO DATOS ===');
        console.log('Datos a guardar:', extractedData);
        
        showNotification('Guardando datos...', 'info');
        
        // Verificar que hay datos para guardar
        if (!extractedData || extractedData.length === 0) {
            showNotification('No hay datos para guardar. Sube un archivo Excel primero.', 'warning');
            return;
        }
        
        // Verificar conexión a Supabase
        if (!window.supabaseClient) {
            throw new Error('No hay conexión a Supabase');
        }
        
        // Preparar datos para Supabase
        const pilotosData = extractedData.map(item => ({
            numero_auto: String(item.numero),
            piloto: item.piloto,
            navegante: item.navegante,
            clase: item.clase
        }));
        
        console.log('💾 Guardando pilotos en Supabase:', pilotosData);
        
        // Limpiar tabla de pilotos existente
        const { error: deleteError } = await window.supabaseClient
            .from('pilotos')
            .delete()
            .neq('id', 0); // Eliminar todos los registros
        
        if (deleteError) {
            console.warn('Error eliminando pilotos existentes:', deleteError);
        }
        
        // Insertar nuevos datos de pilotos
        const { data: insertedData, error: insertError } = await window.supabaseClient
            .from('pilotos')
            .insert(pilotosData)
            .select();
        
        if (insertError) {
            throw insertError;
        }
        
        console.log('✅ Pilotos guardados en Supabase:', insertedData);
        
        // También guardar en localStorage como respaldo
        console.log('💾 Guardando también en localStorage como respaldo...');
        const autosInfo = {};
        extractedData.forEach(item => {
            const numeroAuto = String(item.numero);
            autosInfo[numeroAuto] = {
                piloto: item.piloto,
                navegante: item.navegante,
                clase: item.clase,
                updated_at: new Date().toISOString()
            };
        });
        localStorage.setItem('autos_info', JSON.stringify(autosInfo));
        
        showNotification(`${extractedData.length} pilotos guardados correctamente en Supabase`, 'success');
        clearUpload();
        
        // Actualizar la página para mostrar los nuevos datos
        connectAndLoad();
        
        console.log('=== GUARDADO COMPLETADO ===');
        
    } catch (error) {
        console.error('Error guardando datos:', error);
        showNotification('Error guardando datos: ' + error.message, 'error');
    }
}

// Función de prueba para localStorage
function testLocalStorage() {
    try {
        console.log('=== PROBANDO LOCALSTORAGE ===');
        
        // Crear datos de prueba
        const testData = {
            '123': {
                piloto: 'Juan Pérez',
                navegante: 'María García',
                clase: 'N4',
                updated_at: new Date().toISOString()
            },
            '456': {
                piloto: 'Carlos López',
                navegante: 'Ana Martínez',
                clase: 'N3',
                updated_at: new Date().toISOString()
            }
        };
        
        // Guardar datos de prueba
        localStorage.setItem('autos_info', JSON.stringify(testData));
        console.log('Datos de prueba guardados:', testData);
        
        // Verificar que se guardó
        const savedData = JSON.parse(localStorage.getItem('autos_info') || '{}');
        console.log('Datos guardados verificados:', savedData);
        
        showNotification('Datos de prueba guardados correctamente', 'success');
        
        // Recargar la página para mostrar los datos
        setTimeout(() => {
            if (typeof connectAndLoad === 'function') {
                connectAndLoad();
            } else {
                location.reload();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error en testLocalStorage:', error);
        showNotification('Error en la prueba: ' + error.message, 'error');
    }
}

// Función para limpiar completamente los datos
function clearAllData() {
    try {
        console.log('🧹 LIMPIANDO TODOS LOS DATOS...');
        localStorage.removeItem('autos_info');
        extractedData = [];
        selectedFile = null;
        
        // Limpiar la vista previa
        document.getElementById('preview-data').style.display = 'none';
        document.getElementById('upload-actions').style.display = 'none';
        document.getElementById('excel-input').value = '';
        
        showNotification('Todos los datos han sido limpiados', 'success');
        
    } catch (error) {
        console.error('Error limpiando datos:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Función para comparar números del Excel con la BD
async function compareExcelWithDatabase() {
    try {
        console.log('=== COMPARANDO EXCEL CON BD ===');
        
        // Obtener números de la BD
        const { data: tiempos, error } = await window.supabaseClient
            .from('tiempos_rally')
            .select('numero_auto')
            .limit(100);
            
        if (error) {
            throw error;
        }
        
        const numerosBD = [...new Set(tiempos.map(t => String(t.numero_auto)))];
        console.log('📊 Números en BD:', numerosBD);
        
        // Obtener números del localStorage (del Excel guardado)
        const autosInfo = JSON.parse(localStorage.getItem('autos_info') || '{}');
        const numerosExcel = Object.keys(autosInfo);
        console.log('📊 Números en Excel:', numerosExcel);
        
        // Encontrar coincidencias
        const coincidencias = numerosBD.filter(num => numerosExcel.includes(num));
        const soloEnBD = numerosBD.filter(num => !numerosExcel.includes(num));
        const soloEnExcel = numerosExcel.filter(num => !numerosBD.includes(num));
        
        console.log('✅ Coincidencias:', coincidencias);
        console.log('❌ Solo en BD:', soloEnBD);
        console.log('❌ Solo en Excel:', soloEnExcel);
        
        showNotification(`Coincidencias: ${coincidencias.length}, Solo BD: ${soloEnBD.length}, Solo Excel: ${soloEnExcel.length}`, 'info');
        
    } catch (error) {
        console.error('Error comparando:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Función para verificar qué números están en la BD
async function checkDatabaseNumbers() {
    try {
        console.log('=== VERIFICANDO NÚMEROS EN BD ===');
        
        const { data: tiempos, error } = await window.supabaseClient
            .from('tiempos_rally')
            .select('numero_auto')
            .limit(50);
            
        if (error) {
            throw error;
        }
        
        console.log('📊 Todos los registros:', tiempos);
        console.log('📊 Total registros:', tiempos.length);
        
        const numerosUnicos = [...new Set(tiempos.map(t => t.numero_auto))];
        console.log('📊 Números únicos:', numerosUnicos);
        console.log('📊 Total números únicos:', numerosUnicos.length);
        
        showNotification(`Encontrados ${numerosUnicos.length} autos únicos en la BD`, 'info');
        
    } catch (error) {
        console.error('Error verificando BD:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Función para guardar datos con números reales de la BD
async function saveDataWithRealNumbers() {
    try {
        console.log('=== GUARDANDO CON NÚMEROS REALES ===');
        
        // Obtener datos de la base de datos
        const { data: tiempos, error } = await window.supabaseClient
            .from('tiempos_rally')
            .select('numero_auto')
            .limit(10);
            
        if (error) {
            throw error;
        }
        
        console.log('Números de auto desde BD:', tiempos);
        
        // Crear datos de prueba con números reales
        const testData = {};
        tiempos.forEach((tiempo, index) => {
            if (tiempo.numero_auto) {
                testData[tiempo.numero_auto] = {
                    piloto: `Piloto ${tiempo.numero_auto}`,
                    navegante: `Navegante ${tiempo.numero_auto}`,
                    clase: index % 2 === 0 ? 'N4' : 'N3',
                    updated_at: new Date().toISOString()
                };
            }
        });
        
        console.log('Datos a guardar:', testData);
        
        // Guardar datos
        localStorage.setItem('autos_info', JSON.stringify(testData));
        
        // Verificar que se guardó
        const savedData = JSON.parse(localStorage.getItem('autos_info') || '{}');
        console.log('Datos guardados verificados:', savedData);
        
        showNotification(`${Object.keys(testData).length} autos guardados con números reales`, 'success');
        
    } catch (error) {
        console.error('Error guardando datos reales:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// ==================== FUNCIONES DE VISUALIZACIÓN ====================

function loadTiemposByPrueba() {
    const container = document.getElementById('pruebas-container');
    
    // Usar todos los datos
    let tiemposFiltrados = allTiempos;

    // Obtener pruebas únicas y ordenarlas
    let pruebasUnicas = [...new Set(tiemposFiltrados.map(t => t.prueba))].sort((a, b) => {
        // Ordenar por número de prueba si es posible
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });

    // Si hay un filtro de prueba específica, mostrar solo esa
    if (filteredPrueba) {
        pruebasUnicas = pruebasUnicas.filter(p => p === filteredPrueba);
    }

    // Mostrar sección de resultados
    document.getElementById('results-by-prueba-section').style.display = 'block';

    // Limpiar container
    container.innerHTML = '';

    if (tiemposFiltrados.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <div class="no-data-content">
                    <i class="fas fa-info-circle"></i>
                    <h4>No hay tiempos registrados</h4>
                    <p>No se encontraron tiempos en la base de datos</p>
                </div>
            </div>
        `;
        document.getElementById('results-count-by-prueba').textContent = '0 pruebas';
        return;
    }

    // Crear tabla para cada prueba
    pruebasUnicas.forEach((prueba, pruebaIndex) => {
        const pruebaTiempos = tiemposFiltrados.filter(t => t.prueba === prueba);
        
        // Ordenar por tiempo
        pruebaTiempos.sort((a, b) => {
            const tiempoA = parseFloat(a.tiempo_segundos) || 999999;
            const tiempoB = parseFloat(b.tiempo_segundos) || 999999;
            return tiempoA - tiempoB;
        });

        // Crear contenedor de la prueba
        const pruebaDiv = document.createElement('div');
        pruebaDiv.className = 'prueba-section';
        pruebaDiv.innerHTML = `
            <div class="prueba-header">
                <h4><i class="fas fa-flag"></i> ${prueba}</h4>
                <span class="prueba-count">${pruebaTiempos.length} autos</span>
            </div>
            <div class="table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th class="position-header">
                                <i class="fas fa-medal"></i> Pos
                            </th>
                            <th class="auto-header">
                                <i class="fas fa-car"></i> Auto
                            </th>
                            <th class="piloto-header">
                                <i class="fas fa-user"></i> Piloto
                            </th>
                            <th class="navegante-header">
                                <i class="fas fa-user-friends"></i> Navegante
                            </th>
                            <th class="clase-header">
                                <i class="fas fa-tag"></i> Clase
                            </th>
                            <th class="tiempo-header">
                                <i class="fas fa-stopwatch"></i> Tiempo
                            </th>
                            <th class="largada-header">
                                <i class="fas fa-flag-checkered"></i> Largada
                            </th>
                            <th class="llegada-header">
                                <i class="fas fa-flag"></i> Llegada
                            </th>
                            <th class="fecha-header">
                                <i class="fas fa-calendar"></i> Fecha
                            </th>
                        </tr>
                    </thead>
                    <tbody class="prueba-tbody-${pruebaIndex}">
                        <!-- Filas se agregarán aquí -->
                    </tbody>
                </table>
            </div>
        `;

        container.appendChild(pruebaDiv);

        // Obtener datos de autos desde localStorage
        const autosInfo = JSON.parse(localStorage.getItem('autos_info') || '{}');

        // Agregar filas para esta prueba
        const tbody = pruebaDiv.querySelector(`.prueba-tbody-${pruebaIndex}`);
        pruebaTiempos.forEach((tiempo, index) => {
            const autoInfo = autosInfo[tiempo.numero_auto] || {};
            
            const row = document.createElement('tr');
            row.className = `result-row ${index === 0 ? 'winner' : index < 3 ? 'podium' : ''}`;
            
            row.innerHTML = `
                <td class="position">
                    ${getPositionHTML(index + 1)}
                </td>
                <td class="auto">
                    <span class="auto-number">${tiempo.numero_auto}</span>
                </td>
                <td class="piloto">
                    <span class="piloto-name">${autoInfo.piloto || '-'}</span>
                </td>
                <td class="navegante">
                    <span class="navegante-name">${autoInfo.navegante || '-'}</span>
                </td>
                <td class="clase">
                    <span class="clase-name">${autoInfo.clase || '-'}</span>
                </td>
                <td class="tiempo">
                    <span class="tiempo-value">${tiempo.tiempo_transcurrido || 'N/A'}</span>
                </td>
                <td class="hora">
                    <span class="hora-value">${tiempo.hora_largada || 'N/A'}</span>
                </td>
                <td class="hora">
                    <span class="hora-value">${tiempo.hora_llegada || 'N/A'}</span>
                </td>
                <td class="fecha">
                    <span class="fecha-value">${tiempo.fecha || 'N/A'}</span>
                </td>
            `;

            tbody.appendChild(row);
        });
    });

    // Actualizar contador
    const countText = filteredPrueba ? 
        `1 prueba (${filteredPrueba})` :
        `${pruebasUnicas.length} pruebas`;
    document.getElementById('results-count-by-prueba').textContent = countText;

    // Animar filas
    animateRows();
}

function getPositionHTML(position) {
    if (position === 1) {
        return `
            <div class="position-medal gold">
                <i class="fas fa-medal"></i>
                <span class="position-number">${position}</span>
            </div>
        `;
    } else if (position === 2) {
        return `
            <div class="position-medal silver">
                <i class="fas fa-medal"></i>
                <span class="position-number">${position}</span>
            </div>
        `;
    } else if (position === 3) {
        return `
            <div class="position-medal bronze">
                <i class="fas fa-medal"></i>
                <span class="position-number">${position}</span>
            </div>
        `;
    } else {
        return `<span class="position-number">${position}</span>`;
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function animateRows() {
    const rows = document.querySelectorAll('.result-row');
    rows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            row.style.transition = 'all 0.5s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ==================== AUTO-REFRESH ====================

function startAutoRefresh() {
    autoRefreshInterval = setInterval(async () => {
        try {
            refreshCount++;
            console.log(`Auto-refresh #${refreshCount}`);
            
            // Cargar nuevos datos
            const { data: tiempos, error } = await window.supabaseClient
                .from('tiempos_rally')
                .select('*')
                .order('tiempo_segundos', { ascending: true });
            
            if (!error && tiempos && Array.isArray(tiempos)) {
                // Verificar si realmente hay cambios
                const oldLength = allTiempos.length;
                const hasChanges = JSON.stringify(allTiempos) !== JSON.stringify(tiempos);
                
                if (hasChanges) {
                    allTiempos = tiempos;
                    
                    // Actualizar estadísticas
                    updateStats();
                    
                    // Actualizar filtro de pruebas
                    updatePruebaFilter();
                    
                    // Recargar todas las pruebas
                    loadTiemposByPrueba();
                    
                    // Solo mostrar notificación si hay nuevos registros
                    if (tiempos.length > oldLength) {
                        showNotification('Nuevos tiempos registrados', 'info');
                    }
                }
            }
        } catch (error) {
            console.error('Error en auto-refresh:', error);
        }
    }, 15000); // 15 segundos
}

// Detener auto-refresh cuando se cierra la página
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});

// ==================== FUNCIONES DE MODIFICACIÓN DE TIEMPOS ====================

// Variables globales para la modificación de tiempos
let pilotosData = [];
let tiemposData = [];
let currentPilotTimes = {};

// Cargar datos de pilotos y tiempos al inicializar
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM cargado, iniciando configuración ===');
    console.log('Supabase disponible al inicio:', typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null);
    
    // Esperar un poco más para asegurar que todos los elementos estén listos
    setTimeout(() => {
        // Mostrar indicador inmediatamente
        updateConnectionIndicator();
        
        // Crear datos de prueba inmediatamente para asegurar que funcione
        console.log('Creando datos de prueba inmediatamente...');
        createTestDataLocal();
        
        // Configurar listeners
        setupTimeModifierListeners();
        
        // Intentar cargar desde Supabase después
        setTimeout(async () => {
            console.log('Intentando cargar desde Supabase...');
            try {
                await loadPilotosData();
                await loadTiemposData();
                await checkSupabaseConnection();
                await checkSupabaseTables();
            } catch (error) {
                console.log('Error cargando desde Supabase, usando datos locales:', error);
            }
        }, 1000);
    }, 500);
});

// Función para crear datos de prueba localmente (sin Supabase)
function createTestDataLocal() {
    console.log('=== createTestDataLocal ejecutándose ===');
    console.log('Creando datos de prueba localmente...');
    
    // Crear pilotos de prueba
    pilotosData = [
        { numero_auto: '1', piloto: 'Juan Pérez', navegante: 'María García', clase: 'A' },
        { numero_auto: '2', piloto: 'Carlos López', navegante: 'Ana Martínez', clase: 'B' },
        { numero_auto: '3', piloto: 'Luis Rodríguez', navegante: 'Sofia Fernández', clase: 'A' },
        { numero_auto: '4', piloto: 'Pedro González', navegante: 'Laura Sánchez', clase: 'B' },
        { numero_auto: '5', piloto: 'Miguel Torres', navegante: 'Carmen Ruiz', clase: 'A' }
    ];
    
    // Crear tiempos de prueba con estructura similar a Supabase
    tiemposData = [
        { id: 1, numero_auto: '1', prueba: 'Prueba 1', tiempo_transcurrido: '01:30.50', largada_id: 1, llegada_id: 1 },
        { id: 2, numero_auto: '1', prueba: 'Prueba 2', tiempo_transcurrido: '01:25.30', largada_id: 2, llegada_id: 2 },
        { id: 3, numero_auto: '1', prueba: 'Prueba 3', tiempo_transcurrido: '01:28.15', largada_id: 3, llegada_id: 3 },
        { id: 4, numero_auto: '2', prueba: 'Prueba 1', tiempo_transcurrido: '01:32.15', largada_id: 4, llegada_id: 4 },
        { id: 5, numero_auto: '2', prueba: 'Prueba 2', tiempo_transcurrido: '01:28.45', largada_id: 5, llegada_id: 5 },
        { id: 6, numero_auto: '2', prueba: 'Prueba 3', tiempo_transcurrido: '01:31.20', largada_id: 6, llegada_id: 6 },
        { id: 7, numero_auto: '3', prueba: 'Prueba 1', tiempo_transcurrido: '01:29.80', largada_id: 7, llegada_id: 7 },
        { id: 8, numero_auto: '3', prueba: 'Prueba 2', tiempo_transcurrido: '01:26.20', largada_id: 8, llegada_id: 8 },
        { id: 9, numero_auto: '3', prueba: 'Prueba 3', tiempo_transcurrido: '01:27.90', largada_id: 9, llegada_id: 9 },
        { id: 10, numero_auto: '4', prueba: 'Prueba 1', tiempo_transcurrido: '01:35.40', largada_id: 10, llegada_id: 10 },
        { id: 11, numero_auto: '4', prueba: 'Prueba 2', tiempo_transcurrido: '01:33.10', largada_id: 11, llegada_id: 11 },
        { id: 12, numero_auto: '5', prueba: 'Prueba 1', tiempo_transcurrido: '01:27.60', largada_id: 12, llegada_id: 12 },
        { id: 13, numero_auto: '5', prueba: 'Prueba 2', tiempo_transcurrido: '01:24.80', largada_id: 13, llegada_id: 13 }
    ];
    
    console.log('Datos de prueba creados:', { pilotos: pilotosData.length, tiempos: tiemposData.length });
    console.log('Pilotos:', pilotosData);
    console.log('Tiempos:', tiemposData);
    
    // Poblar los selects
    console.log('Llamando a populatePilotSelect...');
    populatePilotSelect();
    console.log('Llamando a populatePruebaSelect...');
    populatePruebaSelect();
    
    showNotification('Datos de prueba cargados localmente', 'success');
    console.log('=== createTestDataLocal completado ===');
}

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
    const dbStatus = document.getElementById('database-status');
    const dbStatusText = document.getElementById('db-status-text');
    
    console.log('Verificando conexión a Supabase...');
    console.log('Supabase disponible:', typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null);
    
    // Para archivos locales, usar modo local por defecto
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
        try {
            // Verificar que podemos hacer consultas a la base de datos
            const { data, error } = await window.supabaseClient
                .from('tiempos_rally')
                .select('count')
                .limit(1);
            
            if (error) {
                throw error;
            }
            
            console.log('✅ Supabase conectado correctamente');
            showNotification('Conectado a la base de datos de Supabase', 'success');
            
            if (dbStatus && dbStatusText) {
                dbStatus.style.display = 'inline-block';
                dbStatus.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
                dbStatusText.textContent = 'Base de Datos';
                console.log('Indicador actualizado a: Base de Datos');
            }
        } catch (error) {
            console.log('❌ Error de conexión:', error);
            // En caso de error, usar modo local
            showNotification('Usando modo local - datos de prueba', 'info');
            
            if (dbStatus && dbStatusText) {
                dbStatus.style.display = 'inline-block';
                dbStatus.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
                dbStatusText.textContent = 'Modo Local';
            }
        }
    } else {
        console.log('❌ Supabase no disponible - usando modo local');
        showNotification('Modo local - usando datos de prueba', 'info');
        
        if (dbStatus && dbStatusText) {
            dbStatus.style.display = 'inline-block';
            dbStatus.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
            dbStatusText.textContent = 'Modo Local';
        }
    }
}

// Cargar datos de pilotos desde Supabase
async function loadPilotosData() {
    try {
        console.log('=== loadPilotosData ejecutándose ===');
        console.log('Supabase disponible:', typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null);
        
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            console.log('🔗 Conectando a Supabase para cargar pilotos...');
            const { data: pilotos, error } = await window.supabaseClient
                .from('pilotos')
                .select('*')
                .order('numero_auto');
            
            console.log('Resultado de pilotos desde Supabase:', { pilotos: pilotos?.length || 0, error: error?.message || 'Sin error' });
            
            if (error) {
                console.error('Error de Supabase:', error);
                throw error;
            }
            
            pilotosData = pilotos || [];
            console.log('✅ Pilotos cargados desde Supabase:', pilotosData.length);
            console.log('Datos de pilotos:', pilotosData);
            populatePilotSelect();
            updateConnectionIndicator();
            return;
        }
        
        // Fallback a localStorage si no hay Supabase
        console.log('Supabase no disponible, cargando desde localStorage...');
        const storedData = localStorage.getItem('autos_info');
        if (storedData) {
            const data = JSON.parse(storedData);
            pilotosData = Object.keys(data).map(numero => ({
                numero_auto: numero,
                piloto: data[numero].piloto || `Piloto ${numero}`,
                navegante: data[numero].navegante || `Navegante ${numero}`,
                clase: data[numero].clase || 'N4'
            }));
            console.log('Pilotos cargados desde localStorage:', pilotosData.length);
            populatePilotSelect();
            return;
        }
        
        // Si no hay datos en ningún lado, crear datos de prueba
        console.log('No hay datos disponibles, creando datos de prueba');
        pilotosData = [
            { numero_auto: '1', piloto: 'Juan Pérez', navegante: 'María García', clase: 'A' },
            { numero_auto: '2', piloto: 'Carlos López', navegante: 'Ana Martínez', clase: 'B' },
            { numero_auto: '3', piloto: 'Luis Rodríguez', navegante: 'Sofia Fernández', clase: 'A' },
            { numero_auto: '4', piloto: 'Pedro González', navegante: 'Laura Sánchez', clase: 'B' },
            { numero_auto: '5', piloto: 'Miguel Torres', navegante: 'Carmen Ruiz', clase: 'A' }
        ];
        populatePilotSelect();
        updateConnectionIndicator();
        
    } catch (error) {
        console.error('Error cargando datos de pilotos:', error);
        showNotification('Error cargando datos de pilotos: ' + error.message, 'error');
        // Crear datos de prueba como último recurso
        pilotosData = [
            { numero_auto: '1', piloto: 'Juan Pérez', navegante: 'María García', clase: 'A' },
            { numero_auto: '2', piloto: 'Carlos López', navegante: 'Ana Martínez', clase: 'B' },
            { numero_auto: '3', piloto: 'Luis Rodríguez', navegante: 'Sofia Fernández', clase: 'A' },
            { numero_auto: '4', piloto: 'Pedro González', navegante: 'Laura Sánchez', clase: 'B' },
            { numero_auto: '5', piloto: 'Miguel Torres', navegante: 'Carmen Ruiz', clase: 'A' }
        ];
        populatePilotSelect();
    }
}

// Cargar datos de tiempos desde Supabase
async function loadTiemposData() {
    try {
        console.log('=== loadTiemposData ejecutándose ===');
        console.log('Supabase disponible:', typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null);
        
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            console.log('🔗 Conectando a Supabase para cargar tiempos...');
            
            // Intentar cargar sin ordenar primero
            let { data: tiempos, error } = await window.supabaseClient
                .from('tiempos_rally')
                .select('*');
            
            console.log('Resultado de Supabase:', { tiempos: tiempos?.length || 0, error: error?.message || 'Sin error' });
            
            if (error) {
                console.error('Error de Supabase:', error);
                // Si falla, intentar con una consulta más simple
                const { data: tiemposSimple, error: errorSimple } = await window.supabaseClient
                    .from('tiempos_rally')
                    .select('id, numero_auto, prueba, tiempo');
                
                if (errorSimple) {
                    throw errorSimple;
                }
                tiempos = tiemposSimple;
            }
            
            tiemposData = tiempos || [];
            console.log('✅ Tiempos cargados desde Supabase:', tiemposData.length);
            console.log('Datos cargados:', tiemposData);
            populatePruebaSelect();
            updateConnectionIndicator();
            return;
        }
        
        // Fallback a localStorage si no hay Supabase
        console.log('Supabase no disponible, cargando desde localStorage...');
        const storedData = localStorage.getItem('tiempos_rally');
        if (storedData) {
            tiemposData = JSON.parse(storedData);
            console.log('Tiempos cargados desde localStorage:', tiemposData.length);
            populatePruebaSelect();
            return;
        }
        
        // Si no hay datos en ningún lado, crear datos de prueba
        console.log('No hay datos disponibles, creando datos de prueba');
        createTestDataLocal();
        updateConnectionIndicator();
        
    } catch (error) {
        console.error('Error cargando datos de tiempos:', error);
        showNotification('Error cargando datos de tiempos: ' + error.message, 'error');
        // Crear datos de prueba como último recurso
        createTestDataLocal();
        updateConnectionIndicator();
    }
}

// Poblar el select de pilotos
function populatePilotSelect() {
    console.log('=== populatePilotSelect ejecutándose ===');
    console.log('Datos de pilotos disponibles:', pilotosData.length);
    console.log('Datos de pilotos:', pilotosData);
    
    // Esperar un poco para asegurar que el DOM esté listo
    setTimeout(() => {
        const pilotSelect = document.getElementById('pilot-select');
        console.log('Elemento pilotSelect encontrado:', !!pilotSelect);
        
        if (!pilotSelect) {
            console.log('❌ No se encontró el elemento pilot-select');
            return;
        }
        
        // Limpiar select
        pilotSelect.innerHTML = '<option value="">Selecciona un piloto</option>';
        
        if (!pilotosData || pilotosData.length === 0) {
            console.log('No hay datos de pilotos disponibles');
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay pilotos disponibles";
            option.disabled = true;
            pilotSelect.appendChild(option);
            return;
        }
        
        pilotosData.forEach(piloto => {
            const option = document.createElement('option');
            option.value = piloto.numero_auto;
            option.textContent = `${piloto.numero_auto} - ${piloto.piloto} / ${piloto.navegante}`;
            pilotSelect.appendChild(option);
        });
        
        console.log('✅ Select de pilotos poblado con', pilotosData.length, 'opciones');
    }, 100);
}

// Poblar el select de pruebas
function populatePruebaSelect() {
    console.log('=== populatePruebaSelect ejecutándose ===');
    console.log('Datos de tiempos disponibles:', tiemposData.length);
    console.log('Datos de tiempos:', tiemposData);
    
    // Esperar un poco para asegurar que el DOM esté listo
    setTimeout(() => {
        const pruebaSelect = document.getElementById('prueba-select');
        console.log('Elemento pruebaSelect encontrado:', !!pruebaSelect);
        
        if (!pruebaSelect) {
            console.log('❌ No se encontró el elemento prueba-select');
            return;
        }
        
        // Limpiar select
        pruebaSelect.innerHTML = '<option value="">Selecciona una prueba</option>';
        
        if (!tiemposData || tiemposData.length === 0) {
            console.log('No hay datos de tiempos disponibles');
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay pruebas disponibles";
            option.disabled = true;
            pruebaSelect.appendChild(option);
            return;
        }
        
        // Obtener pruebas únicas
        const pruebasUnicas = [...new Set(tiemposData.map(t => t.prueba).filter(prueba => prueba))].sort();
        
        console.log('Pruebas únicas encontradas:', pruebasUnicas);
        
        if (pruebasUnicas.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No se encontraron pruebas";
            option.disabled = true;
            pruebaSelect.appendChild(option);
            return;
        }
        
        pruebasUnicas.forEach(prueba => {
            const option = document.createElement('option');
            option.value = prueba;
            option.textContent = prueba;
            pruebaSelect.appendChild(option);
        });
        
        console.log('✅ Select de pruebas poblado con', pruebasUnicas.length, 'opciones');
    }, 100);
}

// Configurar listeners para la modificación de tiempos
function setupTimeModifierListeners() {
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const pilotSelect = document.getElementById('pilot-select');
    const pruebaSelect = document.getElementById('prueba-select');
    
    if (minutesInput) {
        minutesInput.addEventListener('input', updateTimePreview);
    }
    if (secondsInput) {
        secondsInput.addEventListener('input', updateTimePreview);
    }
    if (millisecondsInput) {
        millisecondsInput.addEventListener('input', updateTimePreview);
    }
    
    // Agregar listeners para los selects
    if (pilotSelect) {
        pilotSelect.addEventListener('change', function() {
            console.log('Piloto seleccionado:', this.value);
            if (pruebaSelect && pruebaSelect.value) {
                loadPilotTimes();
            }
        });
    }
    
    if (pruebaSelect) {
        pruebaSelect.addEventListener('change', function() {
            console.log('Prueba seleccionada:', this.value);
            if (pilotSelect && pilotSelect.value) {
                loadPilotTimes();
            }
        });
    }
}

// Cargar tiempos del piloto seleccionado
function loadPilotTimes() {
    const pilotSelect = document.getElementById('pilot-select');
    const pruebaSelect = document.getElementById('prueba-select');
    
    console.log('=== loadPilotTimes ejecutándose ===');
    console.log('Elementos encontrados:', { pilotSelect: !!pilotSelect, pruebaSelect: !!pruebaSelect });
    
    if (!pilotSelect || !pruebaSelect) {
        console.log('❌ Elementos del formulario no encontrados');
        return;
    }
    
    const numeroAuto = pilotSelect.value;
    const prueba = pruebaSelect.value;
    
    console.log('Valores seleccionados:', { numeroAuto, prueba });
    console.log('Datos de tiempos disponibles:', tiemposData.length);
    console.log('Datos de tiempos:', tiemposData);
    
    if (!numeroAuto || !prueba) {
        console.log('❌ Faltan datos de piloto o prueba');
        hideTimeDisplays();
        return;
    }
    
    // Buscar el tiempo del piloto en la prueba seleccionada
    console.log('🔍 Buscando tiempo...');
    console.log('Tipo de numeroAuto:', typeof numeroAuto, 'Valor:', numeroAuto);
    console.log('Tipo de prueba:', typeof prueba, 'Valor:', prueba);
    
    const tiempoEncontrado = tiemposData.find(t => {
        console.log('Comparando con tiempo:', t);
        console.log('t.numero_auto:', t.numero_auto, 'tipo:', typeof t.numero_auto);
        console.log('t.prueba:', t.prueba, 'tipo:', typeof t.prueba);
        
        const match = t.numero_auto == numeroAuto && t.prueba === prueba;
        console.log('Comparación exacta (===):', t.numero_auto === numeroAuto, t.prueba === prueba);
        console.log('Comparación flexible (==):', t.numero_auto == numeroAuto, t.prueba === prueba);
        console.log('Match final:', match);
        return match;
    });
    
    if (tiempoEncontrado) {
        console.log('✅ Tiempo encontrado:', tiempoEncontrado);
        
        // Extraer el tiempo del campo correcto
        let tiempo = tiempoEncontrado.tiempo_transcurrido || 
                    tiempoEncontrado.tiempo_segundos ||
                    '00:00.000';
        
        // Si el tiempo está en segundos, convertirlo a formato MM:SS.mmm
        if (typeof tiempo === 'number') {
            tiempo = formatTime(tiempo);
        }
        
        console.log('Tiempo extraído:', tiempo);
        
        currentPilotTimes = {
            numero_auto: numeroAuto,
            prueba: prueba,
            tiempo: tiempo,
            id: tiempoEncontrado.id || tiempoEncontrado.largada_id || tiempoEncontrado.llegada_id
        };
        
        showCurrentTime(tiempo);
        console.log('Llamando a updateTimePreview...');
        updateTimePreview();
    } else {
        console.log('❌ No se encontró tiempo para este piloto en esta prueba');
        console.log('Datos disponibles para este auto:', tiemposData.filter(t => t.numero_auto === numeroAuto));
        showNotification(`No se encontró tiempo para el auto ${numeroAuto} en ${prueba}`, 'warning');
        hideTimeDisplays();
    }
}

// Mostrar tiempo actual
function showCurrentTime(tiempo) {
    console.log('=== showCurrentTime ejecutándose ===');
    console.log('Tiempo a mostrar:', tiempo);
    
    const currentTimeDisplay = document.getElementById('current-time-display');
    const currentTimeSpan = document.getElementById('current-time');
    
    console.log('Elementos encontrados:', { 
        currentTimeDisplay: !!currentTimeDisplay, 
        currentTimeSpan: !!currentTimeSpan 
    });
    
    if (currentTimeDisplay && currentTimeSpan) {
        // Formatear el tiempo para mostrar
        const formattedTime = formatTimeForDisplay(tiempo);
        currentTimeSpan.textContent = formattedTime;
        currentTimeDisplay.style.display = 'block';
        console.log('✅ Tiempo mostrado correctamente:', formattedTime);
    } else {
        console.log('❌ No se encontraron los elementos para mostrar el tiempo');
    }
}

// Función para formatear tiempo para mostrar en la interfaz
function formatTimeForDisplay(tiempo) {
    if (!tiempo) return '--:--.---';
    
    // Si ya está en formato HH:MM:SS.MMM, mostrarlo así
    if (tiempo.includes(':') && tiempo.split(':').length === 3) {
        return tiempo;
    }
    
    // Si está en formato MM:SS.CC, convertirlo a HH:MM:SS.MMM
    if (tiempo.includes(':') && tiempo.split(':').length === 2) {
        const parts = tiempo.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const milliseconds = parseInt(secondsParts[1]) || 0;
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    
    return tiempo;
}

// Actualizar vista previa del tiempo
function updateTimePreview() {
    console.log('=== updateTimePreview ejecutándose ===');
    console.log('currentPilotTimes:', currentPilotTimes);
    
    if (!currentPilotTimes.tiempo) {
        console.log('❌ No hay tiempo en currentPilotTimes');
        return;
    }
    
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const operationRadios = document.getElementsByName('operation');
    
    if (!minutesInput || !secondsInput || !millisecondsInput) return;
    
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const milliseconds = parseInt(millisecondsInput.value) || 0;
    
    // Determinar operación
    const operation = Array.from(operationRadios).find(radio => radio.checked)?.value || 'add';
    
    // Convertir tiempo actual a segundos
    const currentTimeInSeconds = timeToSeconds(currentPilotTimes.tiempo);
    
    // Calcular ajuste en segundos
    const adjustmentInSeconds = (minutes * 60) + seconds + (milliseconds / 100);
    
    // Aplicar operación
    let newTimeInSeconds;
    if (operation === 'add') {
        newTimeInSeconds = currentTimeInSeconds + adjustmentInSeconds;
    } else {
        newTimeInSeconds = currentTimeInSeconds - adjustmentInSeconds;
    }
    
    // Asegurar que no sea negativo
    if (newTimeInSeconds < 0) {
        newTimeInSeconds = 0;
    }
    
    // Convertir de vuelta a formato de tiempo
    const newTime = secondsToTime(newTimeInSeconds);
    
    // Mostrar vista previa
    const previewTimeDisplay = document.getElementById('preview-time-display');
    const previewTimeSpan = document.getElementById('preview-time');
    
    if (previewTimeDisplay && previewTimeSpan) {
        const formattedTime = formatTimeForDisplay(newTime);
        previewTimeSpan.textContent = formattedTime;
        previewTimeDisplay.style.display = 'block';
        console.log('✅ Vista previa mostrada:', formattedTime);
    }
    
    // Habilitar botón de aplicar si hay cambios
    const applyBtn = document.getElementById('apply-btn');
    if (applyBtn) {
        const hasChanges = minutes !== 0 || seconds !== 0 || milliseconds !== 0;
        applyBtn.disabled = !hasChanges;
    }
}

// Aplicar modificación de tiempo
async function applyTimeModification() {
    if (!currentPilotTimes.tiempo) {
        showNotification('No hay tiempo seleccionado para modificar', 'warning');
        return;
    }
    
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const operationRadios = document.getElementsByName('operation');
    
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const milliseconds = parseInt(millisecondsInput.value) || 0;
    const operation = Array.from(operationRadios).find(radio => radio.checked)?.value || 'add';
    
    if (minutes === 0 && seconds === 0 && milliseconds === 0) {
        showNotification('No hay ajuste de tiempo para aplicar', 'warning');
        return;
    }
    
    try {
        // Calcular nuevo tiempo - SIEMPRE SUMAR al tiempo existente
        console.log('🔍 CALCULANDO SUMA DE TIEMPO:');
        console.log('currentPilotTimes completo:', currentPilotTimes);
        console.log('Tiempo original de la BD:', currentPilotTimes.tiempo);
        console.log('Tipo de tiempo:', typeof currentPilotTimes.tiempo);
        
        // Verificar que el tiempo existe y no es null/undefined
        if (!currentPilotTimes.tiempo || currentPilotTimes.tiempo === 'null' || currentPilotTimes.tiempo === 'undefined') {
            console.error('❌ ERROR: No hay tiempo válido para sumar');
            showNotification('Error: No se encontró tiempo válido para modificar', 'error');
            return;
        }
        
        // Convertir tiempo actual a segundos
        const currentTimeInSeconds = timeToSeconds(currentPilotTimes.tiempo);
        console.log('Tiempo original en segundos:', currentTimeInSeconds);
        
        // Verificar que la conversión fue exitosa
        if (isNaN(currentTimeInSeconds) || currentTimeInSeconds === 0) {
            console.error('❌ ERROR: No se pudo convertir el tiempo a segundos');
            showNotification('Error: Formato de tiempo inválido', 'error');
            return;
        }
        
        // Calcular ajuste en segundos
        const adjustmentInSeconds = (minutes * 60) + seconds + (milliseconds / 100);
        console.log('Ajuste a sumar en segundos:', adjustmentInSeconds);
        console.log('Minutos:', minutes, 'Segundos:', seconds, 'Milisegundos:', milliseconds);
        
        // SIEMPRE SUMAR - no importa la operación seleccionada
        const newTimeInSeconds = currentTimeInSeconds + adjustmentInSeconds;
        console.log('SUMA FINAL: ' + currentTimeInSeconds + ' + ' + adjustmentInSeconds + ' = ' + newTimeInSeconds);
        
        // Asegurar que no sea negativo
        if (newTimeInSeconds < 0) {
            console.log('⚠️ Tiempo negativo, ajustando a 0');
            newTimeInSeconds = 0;
        }
        
        const newTime = secondsToTime(newTimeInSeconds);
        console.log('Nuevo tiempo formateado:', newTime);
        console.log('✅ Tiempo actualizado de', currentPilotTimes.tiempo, 'a', newTime);
        
        // Actualizar en Supabase
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            console.log('Actualizando tiempo en Supabase...');
            console.log('ID a actualizar:', currentPilotTimes.id);
            console.log('Nuevo tiempo:', newTime);
            
            // Buscar el registro completo para obtener el ID correcto
            const tiempoCompleto = tiemposData.find(t => 
                t.numero_auto == currentPilotTimes.numero_auto && 
                t.prueba === currentPilotTimes.prueba
            );
            
            if (!tiempoCompleto) {
                throw new Error('No se encontró el registro para actualizar');
            }
            
            console.log('Registro encontrado:', tiempoCompleto);
            console.log('Campos disponibles:', Object.keys(tiempoCompleto));
            
            // Usar el ID del registro encontrado - verificar que no sea undefined
            const recordId = tiempoCompleto.id || tiempoCompleto.largada_id || tiempoCompleto.llegada_id;
            console.log('ID del registro:', recordId);
            
            if (!recordId || recordId === 'undefined') {
                throw new Error('No se encontró un ID válido en el registro');
            }
            
            let updateError = null;
            
            // Intentar actualizar por ID primero
            if (recordId) {
                const { error } = await window.supabaseClient
                    .from('tiempos_rally')
                    .update({ 
                        tiempo_transcurrido: newTime
                    })
                    .eq('id', recordId);
                
                updateError = error;
            }
            
            // Si falla por ID, intentar por número de auto y prueba
            if (updateError) {
                console.log('Error con ID, intentando por número de auto y prueba...');
                console.log('Buscando:', { 
                    numero_auto: currentPilotTimes.numero_auto, 
                    prueba: currentPilotTimes.prueba 
                });
                
                // Primero buscar el registro para obtener el ID correcto
                const { data: registros, error: searchError } = await window.supabaseClient
                    .from('tiempos_rally')
                    .select('*')
                    .eq('numero_auto', currentPilotTimes.numero_auto)
                    .eq('prueba', currentPilotTimes.prueba);
                
                if (searchError) {
                    console.error('Error buscando registro:', searchError);
                    updateError = searchError;
                } else if (registros && registros.length > 0) {
                    const registro = registros[0];
                    console.log('Registro encontrado para actualizar:', registro);
                    
                    // Actualizar usando el ID del registro encontrado
                    const { error: updateError2 } = await window.supabaseClient
                        .from('tiempos_rally')
                        .update({ 
                            tiempo_transcurrido: newTime
                        })
                        .eq('id', registro.id);
                    
                    updateError = updateError2;
                } else {
                    updateError = new Error('No se encontró el registro para actualizar');
                }
            }
            
            if (updateError) {
                console.error('Error actualizando en Supabase:', updateError);
                throw updateError;
            }
            
            console.log('Tiempo actualizado en Supabase correctamente');
        }
        
        // También actualizar en localStorage como respaldo
        const storedData = localStorage.getItem('tiempos_rally');
        if (storedData) {
            const data = JSON.parse(storedData);
            const index = data.findIndex(t => t.id === currentPilotTimes.id);
            if (index !== -1) {
                data[index].tiempo = newTime;
                localStorage.setItem('tiempos_rally', JSON.stringify(data));
            }
        } else {
            // Si no hay datos en localStorage, guardar los datos actuales
            localStorage.setItem('tiempos_rally', JSON.stringify(tiemposData));
        }
        
        // Actualizar datos locales
        const tiempoIndex = tiemposData.findIndex(t => t.id === currentPilotTimes.id);
        if (tiempoIndex !== -1) {
            tiemposData[tiempoIndex].tiempo = newTime;
        }
        
        showNotification(`Tiempo actualizado: ${currentPilotTimes.tiempo} → ${newTime}`, 'success');
        
        // Actualizar visualización
        currentPilotTimes.tiempo = newTime;
        showCurrentTime(newTime);
        resetTimeModifier();
        
    } catch (error) {
        console.error('Error aplicando modificación:', error);
        showNotification('Error aplicando modificación de tiempo', 'error');
    }
}

// Reiniciar modificador de tiempo
function resetTimeModifier() {
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const applyBtn = document.getElementById('apply-btn');
    
    if (minutesInput) minutesInput.value = 0;
    if (secondsInput) secondsInput.value = 0;
    if (millisecondsInput) millisecondsInput.value = 0;
    if (applyBtn) applyBtn.disabled = true;
    
    hideTimeDisplays();
}

// Ocultar displays de tiempo
function hideTimeDisplays() {
    const currentTimeDisplay = document.getElementById('current-time-display');
    const previewTimeDisplay = document.getElementById('preview-time-display');
    
    if (currentTimeDisplay) currentTimeDisplay.style.display = 'none';
    if (previewTimeDisplay) previewTimeDisplay.style.display = 'none';
}

// Recargar todos los datos
async function loadAllPilotTimes() {
    await checkSupabaseConnection();
    await loadPilotosData();
    await loadTiemposData();
    resetTimeModifier();
    showNotification('Datos recargados correctamente', 'success');
}

// Verificar tablas disponibles en Supabase
async function checkSupabaseTables() {
    if (typeof window.supabaseClient === 'undefined' || window.supabaseClient === null) {
        console.log('❌ Supabase no disponible para verificar tablas');
        return;
    }
    
    try {
        console.log('🔍 Verificando tablas disponibles en Supabase...');
        
        // Verificar tabla tiempos_rally
        const { data: tiempos, error: errorTiempos } = await window.supabaseClient
            .from('tiempos_rally')
            .select('*')
            .limit(1);
        
        if (errorTiempos) {
            console.log('❌ Error accediendo a tiempos_rally:', errorTiempos.message);
        } else {
            console.log('✅ Tabla tiempos_rally accesible, registros:', tiempos?.length || 0);
        }
        
        // Verificar tabla pilotos
        const { data: pilotos, error: errorPilotos } = await window.supabaseClient
            .from('pilotos')
            .select('*')
            .limit(1);
        
        if (errorPilotos) {
            console.log('❌ Error accediendo a pilotos:', errorPilotos.message);
        } else {
            console.log('✅ Tabla pilotos accesible, registros:', pilotos?.length || 0);
        }
        
    } catch (error) {
        console.error('❌ Error verificando tablas:', error);
    }
}

// Forzar actualización del indicador de conexión
function updateConnectionIndicator() {
    const dbStatus = document.getElementById('database-status');
    const dbStatusText = document.getElementById('db-status-text');
    
    console.log('Actualizando indicador de conexión...');
    console.log('Elementos encontrados:', { dbStatus: !!dbStatus, dbStatusText: !!dbStatusText });
    
    if (dbStatus && dbStatusText) {
        dbStatus.style.display = 'inline-block';
        dbStatus.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
        dbStatusText.textContent = 'Modo Local';
        console.log('✅ Indicador actualizado a: Modo Local');
    } else {
        console.log('❌ No se encontraron los elementos del indicador');
    }
}

// Crear datos de prueba si no hay datos
async function createTestData() {
    console.log('Creando datos de prueba...');
    
    const datosPrueba = [
        { numero_auto: '1', prueba: 'Prueba 1', tiempo: '01:30.50' },
        { numero_auto: '1', prueba: 'Prueba 2', tiempo: '01:25.30' },
        { numero_auto: '1', prueba: 'Prueba 3', tiempo: '01:28.15' },
        { numero_auto: '2', prueba: 'Prueba 1', tiempo: '01:32.15' },
        { numero_auto: '2', prueba: 'Prueba 2', tiempo: '01:28.45' },
        { numero_auto: '2', prueba: 'Prueba 3', tiempo: '01:31.20' },
        { numero_auto: '3', prueba: 'Prueba 1', tiempo: '01:29.80' },
        { numero_auto: '3', prueba: 'Prueba 2', tiempo: '01:26.20' },
        { numero_auto: '3', prueba: 'Prueba 3', tiempo: '01:27.90' },
        { numero_auto: '4', prueba: 'Prueba 1', tiempo: '01:35.40' },
        { numero_auto: '4', prueba: 'Prueba 2', tiempo: '01:33.10' },
        { numero_auto: '5', prueba: 'Prueba 1', tiempo: '01:27.60' },
        { numero_auto: '5', prueba: 'Prueba 2', tiempo: '01:24.80' }
    ];
    
    // Intentar subir a Supabase si está disponible
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
        try {
            console.log('Subiendo datos de prueba a Supabase...');
            
            // Primero limpiar la tabla
            await window.supabaseClient.from('tiempos_rally').delete().neq('id', 0);
            
            // Insertar datos de prueba
            const { data, error } = await window.supabaseClient
                .from('tiempos_rally')
                .insert(datosPrueba);
            
            if (error) {
                console.error('Error subiendo a Supabase:', error);
                throw error;
            }
            
            console.log('✅ Datos de prueba subidos a Supabase');
            showNotification('Datos de prueba creados y subidos a Supabase', 'success');
            
            // Recargar desde Supabase
            await loadTiemposData();
            return;
            
        } catch (error) {
            console.error('Error con Supabase, usando datos locales:', error);
        }
    }
    
    // Fallback a datos locales
    tiemposData = datosPrueba.map((item, index) => ({ ...item, id: index + 1 }));
    
    console.log('Datos de prueba creados localmente:', tiemposData.length);
    console.log('Datos:', tiemposData);
    
    populatePruebaSelect();
    showNotification('Datos de prueba creados localmente', 'info');
    updateConnectionIndicator();
}

// Funciones auxiliares para conversión de tiempo
function timeToSeconds(timeStr) {
    console.log('🕐 Convirtiendo tiempo:', timeStr);
    
    // Limpiar el string de tiempo
    const cleanTime = timeStr.toString().trim();
    
    // Detectar si tiene formato HH:MM:SS.MMM o MM:SS.CC
    if (cleanTime.includes(':') && cleanTime.split(':').length === 3) {
        // Formato HH:MM:SS.MMM
        const parts = cleanTime.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const secondsParts = parts[2].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const milliseconds = parseInt(secondsParts[1]) || 0;
        
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
        console.log('Formato HH:MM:SS.MMM ->', totalSeconds, 'segundos');
        return totalSeconds;
    } else if (cleanTime.includes(':') && cleanTime.split(':').length === 2) {
        // Formato MM:SS.CC
        const parts = cleanTime.split(':');
        const minutes = parseInt(parts[0]) || 0;
        const secondsParts = parts[1].split('.');
        const seconds = parseInt(secondsParts[0]) || 0;
        const milliseconds = parseInt(secondsParts[1]) || 0;
        
        const totalSeconds = (minutes * 60) + seconds + (milliseconds / 100);
        console.log('Formato MM:SS.CC ->', totalSeconds, 'segundos');
        return totalSeconds;
    } else {
        console.error('❌ Formato de tiempo no reconocido:', timeStr);
        return 0;
    }
}

function secondsToTime(totalSeconds) {
    console.log('🕐 Convirtiendo segundos a tiempo:', totalSeconds);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);
    
    // Formato estándar: HH:MM:SS.MMM
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    
    console.log('Tiempo formateado:', timeString);
    return timeString;
}

// Función de debug para verificar el estado de los datos
function debugData() {
    console.log('=== DEBUG DE DATOS ===');
    console.log('Pilotos data:', pilotosData);
    console.log('Tiempos data:', tiemposData);
    console.log('Pilotos length:', pilotosData.length);
    console.log('Tiempos length:', tiemposData.length);
    
    const pilotSelect = document.getElementById('pilot-select');
    const pruebaSelect = document.getElementById('prueba-select');
    
    console.log('Pilot select element:', pilotSelect);
    console.log('Prueba select element:', pruebaSelect);
    
    if (pilotSelect) {
        console.log('Pilot select options:', pilotSelect.options.length);
        for (let i = 0; i < pilotSelect.options.length; i++) {
            console.log(`Option ${i}:`, pilotSelect.options[i].textContent);
        }
    }
    
    if (pruebaSelect) {
        console.log('Prueba select options:', pruebaSelect.options.length);
        for (let i = 0; i < pruebaSelect.options.length; i++) {
            console.log(`Option ${i}:`, pruebaSelect.options[i].textContent);
        }
    }
    
    showNotification('Debug completado - revisa la consola', 'info');
}

// Función para probar la actualización en Supabase
async function testSupabaseUpdate() {
    console.log('=== PROBANDO ACTUALIZACIÓN EN SUPABASE ===');
    
    if (typeof window.supabaseClient === 'undefined' || window.supabaseClient === null) {
        showNotification('Supabase no está disponible', 'error');
        return;
    }
    
    try {
        // Obtener un registro de prueba
        const { data: tiempos, error: fetchError } = await window.supabaseClient
            .from('tiempos_rally')
            .select('*')
            .limit(1);
        
        if (fetchError) {
            console.error('Error obteniendo datos:', fetchError);
            showNotification('Error obteniendo datos: ' + fetchError.message, 'error');
            return;
        }
        
        if (!tiempos || tiempos.length === 0) {
            showNotification('No hay datos para probar', 'warning');
            return;
        }
        
        const registro = tiempos[0];
        console.log('Registro de prueba:', registro);
        
        // Intentar actualizar con un tiempo de prueba
        const tiempoPrueba = '99:99.999';
        const { error: updateError } = await window.supabaseClient
            .from('tiempos_rally')
            .update({ 
                tiempo_transcurrido: tiempoPrueba
            })
            .eq('id', registro.id);
        
        if (updateError) {
            console.error('Error en actualización de prueba:', updateError);
            showNotification('Error en actualización: ' + updateError.message, 'error');
        } else {
            console.log('✅ Actualización de prueba exitosa');
            showNotification('Actualización de prueba exitosa', 'success');
            
            // Restaurar el valor original
            setTimeout(async () => {
                await window.supabaseClient
                    .from('tiempos_rally')
                    .update({ 
                        tiempo_transcurrido: registro.tiempo_transcurrido
                    })
                    .eq('id', registro.id);
                console.log('Valor original restaurado');
            }, 2000);
        }
        
    } catch (error) {
        console.error('Error en prueba de actualización:', error);
        showNotification('Error en prueba: ' + error.message, 'error');
    }
}

// Función alternativa para actualizar tiempo usando una estrategia diferente
async function updateTimeAlternative() {
    console.log('=== ACTUALIZACIÓN ALTERNATIVA ===');
    
    if (!currentPilotTimes.tiempo) {
        showNotification('No hay tiempo seleccionado para modificar', 'warning');
        return;
    }
    
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const operationRadios = document.getElementsByName('operation');
    
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const milliseconds = parseInt(millisecondsInput.value) || 0;
    const operation = Array.from(operationRadios).find(radio => radio.checked)?.value || 'add';
    
    if (minutes === 0 && seconds === 0 && milliseconds === 0) {
        showNotification('No hay ajuste de tiempo para aplicar', 'warning');
        return;
    }
    
    try {
        // Calcular nuevo tiempo
        const currentTimeInSeconds = timeToSeconds(currentPilotTimes.tiempo);
        const adjustmentInSeconds = (minutes * 60) + seconds + (milliseconds / 100);
        
        let newTimeInSeconds;
        if (operation === 'add') {
            newTimeInSeconds = currentTimeInSeconds + adjustmentInSeconds;
        } else {
            newTimeInSeconds = currentTimeInSeconds - adjustmentInSeconds;
        }
        
        if (newTimeInSeconds < 0) {
            newTimeInSeconds = 0;
        }
        
        const newTime = secondsToTime(newTimeInSeconds);
        
        console.log('Nuevo tiempo calculado:', newTime);
        
        // Estrategia alternativa: usar RPC o consulta directa
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            console.log('Intentando actualización alternativa...');
            
            // Primero, obtener todos los registros para encontrar el correcto
            const { data: allTiempos, error: fetchError } = await window.supabaseClient
                .from('tiempos_rally')
                .select('*');
            
            if (fetchError) {
                throw fetchError;
            }
            
            console.log('Todos los registros obtenidos:', allTiempos.length);
            
            // Buscar el registro específico
            const registroEncontrado = allTiempos.find(t => 
                t.numero_auto == currentPilotTimes.numero_auto && 
                t.prueba === currentPilotTimes.prueba
            );
            
            if (!registroEncontrado) {
                throw new Error('No se encontró el registro para actualizar');
            }
            
            console.log('Registro encontrado:', registroEncontrado);
            
            // Actualizar usando el ID exacto
            const { error: updateError } = await window.supabaseClient
                .from('tiempos_rally')
                .update({ 
                    tiempo_transcurrido: newTime
                })
                .eq('id', registroEncontrado.id);
            
            if (updateError) {
                console.error('Error en actualización alternativa:', updateError);
                throw updateError;
            }
            
            console.log('✅ Actualización alternativa exitosa');
            
            // Actualizar datos locales
            const tiempoIndex = tiemposData.findIndex(t => t.id === registroEncontrado.id);
            if (tiempoIndex !== -1) {
                tiemposData[tiempoIndex].tiempo_transcurrido = newTime;
            }
            
            // Actualizar currentPilotTimes
            currentPilotTimes.tiempo = newTime;
            
            showNotification(`Tiempo actualizado: ${currentPilotTimes.tiempo} → ${newTime}`, 'success');
            
            // Actualizar visualización
            showCurrentTime(newTime);
            resetTimeModifier();
            
        } else {
            throw new Error('Supabase no está disponible');
        }
        
    } catch (error) {
        console.error('Error en actualización alternativa:', error);
        showNotification('Error en actualización alternativa: ' + error.message, 'error');
    }
}

// Función para reemplazar el tiempo (eliminar y crear nuevo)
async function updateTimeReplace() {
    console.log('=== REEMPLAZO DE TIEMPO ===');
    
    if (!currentPilotTimes.tiempo) {
        showNotification('No hay tiempo seleccionado para modificar', 'warning');
        return;
    }
    
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const operationRadios = document.getElementsByName('operation');
    
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const milliseconds = parseInt(millisecondsInput.value) || 0;
    const operation = Array.from(operationRadios).find(radio => radio.checked)?.value || 'add';
    
    if (minutes === 0 && seconds === 0 && milliseconds === 0) {
        showNotification('No hay ajuste de tiempo para aplicar', 'warning');
        return;
    }
    
    try {
        // Calcular nuevo tiempo
        const currentTimeInSeconds = timeToSeconds(currentPilotTimes.tiempo);
        const adjustmentInSeconds = (minutes * 60) + seconds + (milliseconds / 100);
        
        let newTimeInSeconds;
        if (operation === 'add') {
            newTimeInSeconds = currentTimeInSeconds + adjustmentInSeconds;
        } else {
            newTimeInSeconds = currentTimeInSeconds - adjustmentInSeconds;
        }
        
        if (newTimeInSeconds < 0) {
            newTimeInSeconds = 0;
        }
        
        const newTime = secondsToTime(newTimeInSeconds);
        
        console.log('Nuevo tiempo calculado:', newTime);
        
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            console.log('Iniciando reemplazo de tiempo...');
            
            // Estrategia de reemplazo: eliminar el registro viejo y crear uno nuevo
            const { data: registros, error: searchError } = await window.supabaseClient
                .from('tiempos_rally')
                .select('*')
                .eq('numero_auto', currentPilotTimes.numero_auto)
                .eq('prueba', currentPilotTimes.prueba);
            
            if (searchError) {
                throw searchError;
            }
            
            if (!registros || registros.length === 0) {
                throw new Error('No se encontró el registro para reemplazar');
            }
            
            console.log('Registros encontrados para reemplazar:', registros.length);
            
            // Eliminar todos los registros que coincidan
            for (const registro of registros) {
                console.log('Eliminando registro:', registro.id);
                const { error: deleteError } = await window.supabaseClient
                    .from('tiempos_rally')
                    .delete()
                    .eq('id', registro.id);
                
                if (deleteError) {
                    console.warn('Error eliminando registro:', deleteError);
                } else {
                    console.log('Registro eliminado exitosamente');
                }
            }
            
            // Crear nuevo registro con el tiempo actualizado
            const nuevoRegistro = {
                numero_auto: currentPilotTimes.numero_auto,
                prueba: currentPilotTimes.prueba,
                tiempo_transcurrido: newTime,
                fecha: new Date().toISOString().split('T')[0]
            };
            
            console.log('Creando nuevo registro:', nuevoRegistro);
            
            const { data: nuevoData, error: insertError } = await window.supabaseClient
                .from('tiempos_rally')
                .insert([nuevoRegistro])
                .select();
            
            if (insertError) {
                throw insertError;
            }
            
            console.log('✅ Nuevo registro creado exitosamente:', nuevoData);
            
            // Actualizar datos locales
            const tiempoIndex = tiemposData.findIndex(t => 
                t.numero_auto == currentPilotTimes.numero_auto && 
                t.prueba === currentPilotTimes.prueba
            );
            
            if (tiempoIndex !== -1) {
                tiemposData[tiempoIndex] = { ...nuevoRegistro, id: nuevoData[0].id };
            } else {
                tiemposData.push({ ...nuevoRegistro, id: nuevoData[0].id });
            }
            
            // Actualizar currentPilotTimes
            currentPilotTimes.tiempo = newTime;
            currentPilotTimes.id = nuevoData[0].id;
            
            showNotification(`Tiempo reemplazado: ${currentPilotTimes.tiempo} → ${newTime}`, 'success');
            
            // Actualizar visualización
            showCurrentTime(newTime);
            resetTimeModifier();
            
        } else {
            throw new Error('Supabase no está disponible');
        }
        
    } catch (error) {
        console.error('Error en reemplazo de tiempo:', error);
        showNotification('Error en reemplazo: ' + error.message, 'error');
    }
}

// Función para verificar qué tablas están disponibles
async function checkTables() {
    console.log('=== VERIFICANDO TABLAS DISPONIBLES ===');
    
    if (typeof window.supabaseClient === 'undefined' || window.supabaseClient === null) {
        showNotification('Supabase no está disponible', 'error');
        return;
    }
    
    const tablas = ['largadas', 'llegadas', 'tiempos_rally', 'pilotos'];
    
    for (const tabla of tablas) {
        try {
            console.log(`Verificando tabla: ${tabla}`);
            const { data, error } = await window.supabaseClient
                .from(tabla)
                .select('*')
                .limit(1);
            
            if (error) {
                console.log(`❌ ${tabla}: ${error.message}`);
            } else {
                console.log(`✅ ${tabla}: ${data.length} registros encontrados`);
                if (data.length > 0) {
                    console.log(`   Estructura:`, Object.keys(data[0]));
                }
            }
        } catch (err) {
            console.log(`❌ ${tabla}: Error - ${err.message}`);
        }
    }
    
    showNotification('Verificación de tablas completada - revisa la consola', 'info');
}

// Función para actualizar tiempo usando las tablas base (largadas y llegadas)
async function updateTimeWithBaseTables() {
    console.log('=== ACTUALIZACIÓN CON TABLAS BASE ===');
    
    if (!currentPilotTimes.tiempo) {
        showNotification('No hay tiempo seleccionado para modificar', 'warning');
        return;
    }
    
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const operationRadios = document.getElementsByName('operation');
    
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const milliseconds = parseInt(millisecondsInput.value) || 0;
    const operation = Array.from(operationRadios).find(radio => radio.checked)?.value || 'add';
    
    if (minutes === 0 && seconds === 0 && milliseconds === 0) {
        showNotification('No hay ajuste de tiempo para aplicar', 'warning');
        return;
    }
    
    try {
        // Calcular nuevo tiempo
        const currentTimeInSeconds = timeToSeconds(currentPilotTimes.tiempo);
        const adjustmentInSeconds = (minutes * 60) + seconds + (milliseconds / 100);
        
        let newTimeInSeconds;
        if (operation === 'add') {
            newTimeInSeconds = currentTimeInSeconds + adjustmentInSeconds;
        } else {
            newTimeInSeconds = currentTimeInSeconds - adjustmentInSeconds;
        }
        
        if (newTimeInSeconds < 0) {
            newTimeInSeconds = 0;
        }
        
        const newTime = secondsToTime(newTimeInSeconds);
        
        console.log('Nuevo tiempo calculado:', newTime);
        
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            console.log('Buscando registros en tablas base...');
            
            // Buscar en la tabla llegadas (que probablemente contiene los tiempos)
            const { data: llegadas, error: llegadasError } = await window.supabaseClient
                .from('llegadas')
                .select('*')
                .eq('numero_auto', currentPilotTimes.numero_auto);
            
            if (llegadasError) {
                console.error('Error buscando en llegadas:', llegadasError);
                throw llegadasError;
            }
            
            console.log('Registros en llegadas:', llegadas);
            
            if (llegadas && llegadas.length > 0) {
                // Actualizar el primer registro encontrado
                const registro = llegadas[0];
                console.log('Actualizando registro en llegadas:', registro);
                
                const { error: updateError } = await window.supabaseClient
                    .from('llegadas')
                    .update({ 
                        tiempo_transcurrido: newTime
                    })
                    .eq('id', registro.id);
                
                if (updateError) {
                    console.error('Error actualizando llegadas:', updateError);
                    throw updateError;
                }
                
                console.log('✅ Tiempo actualizado en llegadas');
                
                // Actualizar datos locales
                const tiempoIndex = tiemposData.findIndex(t => 
                    t.numero_auto == currentPilotTimes.numero_auto && 
                    t.prueba === currentPilotTimes.prueba
                );
                
                if (tiempoIndex !== -1) {
                    tiemposData[tiempoIndex].tiempo_transcurrido = newTime;
                }
                
                // Actualizar currentPilotTimes
                currentPilotTimes.tiempo = newTime;
                
                showNotification(`Tiempo actualizado: ${currentPilotTimes.tiempo} → ${newTime}`, 'success');
                
                // Actualizar visualización
                showCurrentTime(newTime);
                resetTimeModifier();
                
            } else {
                throw new Error('No se encontraron registros en la tabla llegadas');
            }
            
        } else {
            throw new Error('Supabase no está disponible');
        }
        
    } catch (error) {
        console.error('Error en actualización con tablas base:', error);
        showNotification('Error en actualización: ' + error.message, 'error');
    }
}

// Función principal para actualizar tiempo - SIMPLIFICADA
async function updateTime() {
    console.log('=== ACTUALIZAR TIEMPO ===');
    
    if (!currentPilotTimes.tiempo) {
        showNotification('No hay tiempo seleccionado para modificar', 'warning');
        return;
    }
    
    const minutesInput = document.getElementById('minutes-input');
    const secondsInput = document.getElementById('seconds-input');
    const millisecondsInput = document.getElementById('milliseconds-input');
    const operationRadios = document.getElementsByName('operation');
    
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const milliseconds = parseInt(millisecondsInput.value) || 0;
    const operation = Array.from(operationRadios).find(radio => radio.checked)?.value || 'add';
    
    if (minutes === 0 && seconds === 0 && milliseconds === 0) {
        showNotification('No hay ajuste de tiempo para aplicar', 'warning');
        return;
    }
    
    try {
        // Calcular nuevo tiempo
        const currentTimeInSeconds = timeToSeconds(currentPilotTimes.tiempo);
        const adjustmentInSeconds = (minutes * 60) + seconds + (milliseconds / 100);
        
        let newTimeInSeconds;
        if (operation === 'add') {
            newTimeInSeconds = currentTimeInSeconds + adjustmentInSeconds;
        } else {
            newTimeInSeconds = currentTimeInSeconds - adjustmentInSeconds;
        }
        
        if (newTimeInSeconds < 0) {
            newTimeInSeconds = 0;
        }
        
        const newTime = secondsToTime(newTimeInSeconds);
        
        console.log('Tiempo actual:', currentPilotTimes.tiempo);
        console.log('Ajuste:', `${operation} ${minutes}m ${seconds}s ${milliseconds}ms`);
        console.log('Nuevo tiempo:', newTime);
        
        // Mostrar confirmación antes de actualizar
        const confirmar = confirm(`¿Estás seguro de que quieres cambiar el tiempo de ${currentPilotTimes.tiempo} a ${newTime}?`);
        if (!confirmar) {
            showNotification('Actualización cancelada', 'info');
            return;
        }
        
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            // Buscar el registro en la vista para obtener los IDs
            const { data: registros, error: searchError } = await window.supabaseClient
                .from('tiempos_rally')
                .select('*')
                .eq('numero_auto', currentPilotTimes.numero_auto)
                .eq('prueba', currentPilotTimes.prueba);
            
            if (searchError) {
                console.error('Error buscando registro:', searchError);
                throw searchError;
            }
            
            if (!registros || registros.length === 0) {
                throw new Error('No se encontró el registro para actualizar');
            }
            
            const registro = registros[0];
            console.log('Registro encontrado:', registro);
            
            // Obtener los IDs de largada y llegada
            const largadaId = registro.largada_id;
            const llegadaId = registro.llegada_id;
            
            if (!llegadaId) {
                throw new Error('No se encontró el ID de llegada para actualizar');
            }
            
            // Obtener la hora de largada actual
            const { data: largadaData, error: largadaError } = await window.supabaseClient
                .from('largadas')
                .select('hora_largada')
                .eq('id', largadaId)
                .single();
            
            if (largadaError) {
                console.error('Error obteniendo hora de largada:', largadaError);
                throw largadaError;
            }
            
            // Calcular la nueva hora de llegada
            const horaLargada = largadaData.hora_largada;
            
            // Convertir hora de largada a segundos desde medianoche
            const [hora, minuto, segundo] = horaLargada.split(':');
            const segundosLargada = parseInt(hora) * 3600 + parseInt(minuto) * 60 + parseFloat(segundo);
            
            // Calcular nueva hora de llegada en segundos
            const nuevaSegundosLlegada = segundosLargada + newTimeInSeconds;
            
            // Convertir de vuelta a formato HH:MM:SS.MS
            const nuevaHora = Math.floor(nuevaSegundosLlegada / 3600);
            const nuevaMinuto = Math.floor((nuevaSegundosLlegada % 3600) / 60);
            const nuevaSegundo = nuevaSegundosLlegada % 60;
            
            const nuevaHoraLlegada = `${nuevaHora.toString().padStart(2, '0')}:${nuevaMinuto.toString().padStart(2, '0')}:${nuevaSegundo.toFixed(3).padStart(6, '0')}`;
            
            console.log('Hora de largada:', horaLargada);
            console.log('Nueva hora de llegada:', nuevaHoraLlegada);
            
            // Actualizar la hora de llegada en la tabla llegadas
            const { error: updateError } = await window.supabaseClient
                .from('llegadas')
                .update({ 
                    hora_llegada: nuevaHoraLlegada
                })
                .eq('id', llegadaId);
            
            if (updateError) {
                console.error('Error actualizando hora de llegada:', updateError);
                throw updateError;
            }
            
            console.log('✅ Hora de llegada actualizada correctamente en Supabase');
            
            // Recargar datos para actualizar la vista
            await loadTiemposData();
            await loadPilotTimes();
            
            showNotification(`✅ Tiempo actualizado: ${currentPilotTimes.tiempo} → ${newTime}`, 'success');
            
            // Actualizar visualización
            showCurrentTime(newTime);
            resetTimeModifier();
            
        } else {
            throw new Error('Supabase no está disponible');
        }
        
    } catch (error) {
        console.error('Error actualizando tiempo:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Función para debuggear formatos de hora
async function debugTimeFormats() {
    console.log('=== DEBUG FORMATOS DE HORA ===');
    
    try {
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            // Verificar formato de horas en largadas
            const { data: largadas, error: largadasError } = await window.supabaseClient
                .from('largadas')
                .select('hora_largada')
                .limit(3);
            
            if (largadasError) {
                console.error('Error obteniendo largadas:', largadasError);
            } else {
                console.log('Ejemplos de hora_largada:', largadas);
            }
            
            // Verificar formato de horas en llegadas
            const { data: llegadas, error: llegadasError } = await window.supabaseClient
                .from('llegadas')
                .select('hora_llegada')
                .limit(3);
            
            if (llegadasError) {
                console.error('Error obteniendo llegadas:', llegadasError);
            } else {
                console.log('Ejemplos de hora_llegada:', llegadas);
            }
            
            // Verificar vista tiempos_rally
            const { data: tiempos, error: tiemposError } = await window.supabaseClient
                .from('tiempos_rally')
                .select('hora_largada, hora_llegada, tiempo_transcurrido')
                .limit(3);
            
            if (tiemposError) {
                console.error('Error obteniendo tiempos:', tiemposError);
            } else {
                console.log('Ejemplos de tiempos_rally:', tiempos);
            }
            
        } else {
            console.log('Supabase no está disponible');
        }
        
    } catch (error) {
        console.error('Error en debug de formatos:', error);
    }
}

console.log('JavaScript de administración cargado correctamente');
