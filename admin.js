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
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
        const { data: tiempos, error } = await supabase
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
        
        // LIMPIAR localStorage completamente para evitar datos antiguos
        console.log('🧹 Limpiando localStorage anterior...');
        localStorage.removeItem('autos_info');
        
        // Obtener datos existentes del localStorage
        let autosInfo = JSON.parse(localStorage.getItem('autos_info') || '{}');
        console.log('Datos existentes:', autosInfo);
        
        // Actualizar con los nuevos datos
        extractedData.forEach(item => {
            console.log('Guardando auto:', item.numero, item);
            // Convertir número a string para que coincida con la BD
            const numeroAuto = String(item.numero);
            console.log(`💾 Guardando auto ${numeroAuto} con piloto: ${item.piloto}, navegante: ${item.navegante}, clase: ${item.clase}`);
            autosInfo[numeroAuto] = {
                piloto: item.piloto,
                navegante: item.navegante,
                clase: item.clase,
                updated_at: new Date().toISOString()
            };
        });
        
        console.log('Datos finales a guardar:', autosInfo);
        
        // Guardar en localStorage
        localStorage.setItem('autos_info', JSON.stringify(autosInfo));
        
        // Verificar que se guardó correctamente
        const savedData = JSON.parse(localStorage.getItem('autos_info') || '{}');
        console.log('Datos guardados verificados:', savedData);
        
        showNotification(`${extractedData.length} autos guardados correctamente`, 'success');
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
        const { data: tiempos, error } = await supabase
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
        
        const { data: tiempos, error } = await supabase
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
        const { data: tiempos, error } = await supabase
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
            const { data: tiempos, error } = await supabase
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

console.log('JavaScript de administración cargado correctamente');
