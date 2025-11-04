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

// Inicializar cliente de Supabase con espera
let supabaseClient = null;

// Hacer que las funciones estén disponibles globalmente desde el inicio
window.crearRally = async function() {
    console.error('crearRally llamado antes de la definición completa');
    alert('Las funciones aún no están listas. Recarga la página.');
};
window.actualizarRally = async function() {
    console.error('actualizarRally llamado antes de la definición completa');
    alert('Las funciones aún no están listas. Recarga la página.');
};
window.finalizarRally = async function() {
    console.error('finalizarRally llamado antes de la definición completa');
    alert('Las funciones aún no están listas. Recarga la página.');
};
window.activarRally = async function(rallyId) {
    console.error('activarRally llamado antes de la definición completa');
    alert('Las funciones aún no están listas. Recarga la página.');
};

async function initializeSupabase() {
    // Esperar hasta 3 segundos (30 intentos x 100ms) para que el SDK cargue
    for (let i = 0; i < 30; i++) {
        if (window.supabase) {
            try {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                window.supabaseClient = supabaseClient;
                console.log('✅ Cliente de Supabase inicializado correctamente');
                return supabaseClient;
            } catch (error) {
                console.error('❌ Error inicializando Supabase:', error);
                return null;
            }
        }
        console.log(`⏳ Esperando SDK de Supabase... intento ${i + 1}/30`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('❌ SDK de Supabase no disponible después de 30 intentos');
    return null;
}

// Inicializar inmediatamente
initializeSupabase().then(() => {
    console.log('Supabase ready:', !!supabaseClient);
});

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

// Variables para gestión de rallyes
let rallyesData = [];
let rallyActivoActual = '';

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== Página de administración cargada ===');
    console.log('Supabase disponible:', typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null);
    
    // Esperar a que Supabase esté listo
    let retries = 0;
    while ((typeof window.supabaseClient === 'undefined' || window.supabaseClient === null) && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        console.log(`Esperando Supabase... intento ${retries}`);
    }
    
    if (window.supabaseClient) {
        console.log('✅ Supabase listo');
    } else {
        console.error('❌ Supabase no disponible después de 10 intentos');
    }
    
    // Conectar y cargar datos
    await connectAndLoad();
    
    // Cargar rallyes
    await loadRallyes();
    
    // Configurar evento para cambiar rally
    document.getElementById('rally-select')?.addEventListener('change', async function() {
        const rallyId = this.value;
        const rally = rallyesData.find(r => r.id == rallyId);
        
        const fotoInput = document.getElementById('rally-foto-input');
        const nombreInput = document.getElementById('rally-nombre-input');
        
        if (fotoInput && rally) {
            // Limpiar el input de archivo al cambiar de rally
            fotoInput.value = '';
            // Mostrar la imagen del rally seleccionado
            mostrarImagenRally(rally);
        }
        if (nombreInput && rally) {
            nombreInput.value = rally.nombre || '';
        }
        
        if (rally) {
            rallyActivoActual = rally.nombre;
            
            // Deshabilitar controles de modificación si el rally está finalizado
            const btnGuardar = document.querySelector('button[onclick="actualizarRally()"]');
            const btnFinalizar = document.querySelector('button[onclick="finalizarRally()"]');
            const nombreInputEnabled = document.getElementById('rally-nombre-input');
            const fotoInputEnabled = document.getElementById('rally-foto-input');
            
            if (rally.activo) {
                // Rally activo - habilitar controles
                if (btnGuardar) btnGuardar.disabled = false;
                if (btnFinalizar) btnFinalizar.disabled = false;
                if (nombreInputEnabled) nombreInputEnabled.disabled = false;
                if (fotoInputEnabled) fotoInputEnabled.disabled = false;
            } else {
                // Rally finalizado - deshabilitar controles de modificación
                if (btnGuardar) btnGuardar.disabled = true;
                if (btnFinalizar) btnFinalizar.disabled = true;
                if (nombreInputEnabled) nombreInputEnabled.disabled = true;
                if (fotoInputEnabled) fotoInputEnabled.disabled = true;
                showNotification('Rally finalizado - Solo lectura', 'info');
            }
        }
        
        // Recargar datos del nuevo rally
        await connectAndLoad();
        
        // Recargar selects de piloto y prueba para el nuevo rally
        populatePilotSelect();
        populatePruebaSelect();
        
        // Limpiar selección actual de modificar tiempos
        const pilotSelect = document.getElementById('pilot-select');
        const pruebaSelect = document.getElementById('prueba-select');
        if (pilotSelect) pilotSelect.value = '';
        if (pruebaSelect) pruebaSelect.value = '';
        hideTimeDisplays();
    });
    
    // Cargar datos de pilotos y tiempos
    setTimeout(async () => {
        try {
            await loadPilotosData();
            await loadTiemposData();
            await checkSupabaseConnection();
            setupTimeModifierListeners();
            
            // Cargar tiempos por prueba
            loadTiemposByPrueba();
        } catch (error) {
            console.log('Error cargando datos:', error);
        }
    }, 500);
    
    // Iniciar refresco automático
    startAutoRefresh();
    
    // Configurar Excel upload
    setupExcelUpload();
    
    // Preview de nueva imagen cuando se selecciona un archivo
    const fotoInput = document.getElementById('rally-foto-input');
    const fotoNuevaPreview = document.getElementById('foto-nueva-preview');
    const fotoNuevaPreviewImg = document.getElementById('foto-nueva-preview-img');
    const btnCancelarUpload = document.getElementById('btn-cancelar-upload');
    
    if (fotoInput && fotoNuevaPreview && fotoNuevaPreviewImg) {
        fotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    fotoNuevaPreviewImg.src = e.target.result;
                    fotoNuevaPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                fotoNuevaPreview.style.display = 'none';
            }
        });
    }
    
    // Botón cancelar upload
    if (btnCancelarUpload && fotoInput) {
        btnCancelarUpload.addEventListener('click', function() {
            fotoInput.value = '';
            if (fotoNuevaPreview) {
                fotoNuevaPreview.style.display = 'none';
            }
        });
    }
});

// ==================== FUNCIONES DE DATOS ====================

// Función helper para obtener el nombre del rally activo actual
function obtenerNombreRallyActual() {
    try {
        const rallySelect = document.getElementById('rally-select');
        if (rallySelect && rallySelect.selectedIndex >= 0 && rallySelect.selectedOptions.length > 0) {
            const selectedOption = rallySelect.selectedOptions[0];
            const nombreDelRally = selectedOption.dataset.nombre || selectedOption.textContent || rallyActivoActual;
            return nombreDelRally;
        }
        return rallyActivoActual || '';
    } catch (error) {
        return rallyActivoActual || '';
    }
}

async function connectAndLoad() {
    try {
        console.log('=== connectAndLoad ===');
        
        if (!window.supabaseClient) {
            console.error('Supabase no está disponible');
            showNotification('Supabase no está disponible. Esperando...', 'warning');
            allTiempos = [];
            updateStats();
            updatePruebaFilter();
            loadTiemposByPrueba();
            return;
        }
        
        showNotification('Conectando a la base de datos...', 'info');
        
        // CARGAR PILOTOS PRIMERO para asegurar que estén disponibles
        await loadPilotosData();
        
        // Obtener rally activo actual usando función helper
        const nombreRallyActivo = obtenerNombreRallyActual();
        
        // Cargar datos de la vista tiempos_rally FILTRADOS por nombre_rally
        let query = window.supabaseClient
            .from('tiempos_rally')
            .select('*')
            .order('tiempo_segundos', { ascending: true });
        
        if (nombreRallyActivo) {
            query = query.eq('nombre_rally', nombreRallyActivo);
        }
        
        const { data: tiempos, error } = await query;

        if (error) {
            console.error('Error cargando desde Supabase:', error);
            throw error;
        }

        allTiempos = tiempos || [];
        
        console.log('✅ Tiempos cargados:', allTiempos.length);
        console.log('Tiempos:', allTiempos);
        
        // Actualizar estadísticas
        updateStats();
        
        // Actualizar filtro de pruebas
        updatePruebaFilter();
        
        // Cargar todas las pruebas (ahora los pilotos ya están en localStorage)
        loadTiemposByPrueba();
        
        showNotification('Datos cargados correctamente', 'success');
        
    } catch (error) {
        // Error silencioso - no mostrar ni registrar para evitar logs molestos
        allTiempos = [];
        updateStats();
        updatePruebaFilter();
        loadTiemposByPrueba();
    }
}

function updateStats() {
    const totalRegistrosEl = document.getElementById('total-registros');
    const promedioEl = document.getElementById('promedio');
    const mejorEl = document.getElementById('mejor');
    
    // Verificar que los elementos existen antes de usarlos
    if (!totalRegistrosEl || !promedioEl || !mejorEl) {
        console.log('Elementos de estadísticas no encontrados, saltando actualización');
        return;
    }
    
    if (allTiempos.length === 0) {
        totalRegistrosEl.textContent = '0';
        promedioEl.textContent = '-';
        mejorEl.textContent = '-';
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

    totalRegistrosEl.textContent = allTiempos.length;
    promedioEl.textContent = promedioTiempo;
    mejorEl.textContent = mejorTiempo;
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
        await connectAndLoad();
        
        // Recargar también los datos de pilotos y tiempos
        await loadPilotosData();
        await loadTiemposData();
        
        // Forzar recarga de pruebas
        loadTiemposByPrueba();
        
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
    const resultsCountEl = document.getElementById('results-count-by-prueba');
    
    console.log('=== loadTiemposByPrueba ===');
    console.log('Total tiempos disponibles:', allTiempos.length);
    console.log('Tiempos:', allTiempos);
    
    // Verificar que los elementos existen
    if (!container) {
        console.log('Container de pruebas no encontrado');
        return;
    }
    
    // Usar todos los datos
    let tiemposFiltrados = allTiempos;

    // Obtener pruebas únicas y ordenarlas
    let pruebasUnicas = [...new Set(tiemposFiltrados.map(t => t.prueba))].sort((a, b) => {
        // Ordenar por número de prueba si es posible
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });

    console.log('Pruebas únicas encontradas:', pruebasUnicas);

    // Si hay un filtro de prueba específica, mostrar solo esa
    if (filteredPrueba) {
        pruebasUnicas = pruebasUnicas.filter(p => p === filteredPrueba);
        console.log('Filtrando prueba:', filteredPrueba);
    }

    // Actualizar contador (solo si el elemento existe)
    if (resultsCountEl) {
        resultsCountEl.textContent = `${pruebasUnicas.length} prueba(s) - ${tiemposFiltrados.length} tiempos totales`;
    }

    // Limpiar container
    container.innerHTML = '';

    if (pruebasUnicas.length === 0 || tiemposFiltrados.length === 0) {
        console.log('⚠️ No hay tiempos disponibles');
        container.innerHTML = `
            <div class="no-data">
                <div class="no-data-content">
                    <i class="fas fa-info-circle"></i>
                    <h4>No hay tiempos registrados</h4>
                    <p>Los tiempos aparecerán aquí cuando se registren largadas y llegadas en las aplicaciones correspondientes.</p>
                </div>
            </div>
        `;
        if (resultsCountEl) {
            resultsCountEl.textContent = '0 pruebas disponibles';
        }
        return;
    }
    
    console.log('✅ Generando tablas para', pruebasUnicas.length, 'pruebas');

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
        console.log('📊 Datos de autos desde localStorage:', autosInfo);

        // Agregar filas para esta prueba
        const tbody = pruebaDiv.querySelector(`.prueba-tbody-${pruebaIndex}`);
        pruebaTiempos.forEach((tiempo, index) => {
            // Convertir numero_auto a string para asegurar coincidencia
            const numeroAutoStr = String(tiempo.numero_auto);
            const autoInfo = autosInfo[numeroAutoStr] || {};
            
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
    if (resultsCountEl) {
        const countText = filteredPrueba ? 
            `1 prueba (${filteredPrueba})` :
            `${pruebasUnicas.length} pruebas`;
        resultsCountEl.textContent = countText;
    }

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
            
            // Obtener rally activo actual ANTES de cargar usando función helper
            const nombreRallyActivo = obtenerNombreRallyActual();
            
            // Cargar nuevos datos FILTRADOS por rally activo
            let query = window.supabaseClient
                .from('tiempos_rally')
                .select('*')
                .order('tiempo_segundos', { ascending: true });
            
            // Filtrar por rally activo si existe
            if (nombreRallyActivo) {
                query = query.eq('nombre_rally', nombreRallyActivo);
            }
            
            const { data: tiempos, error } = await query;
            
            if (!error && tiempos && Array.isArray(tiempos)) {
                // Verificar si realmente hay cambios comparando con los datos filtrados
                const oldLength = allTiempos.length;
                const hasChanges = JSON.stringify(allTiempos) !== JSON.stringify(tiempos);
                
                if (hasChanges) {
                    // SOLO actualizar allTiempos si seguimos en el mismo rally
                    const currentRallyFromSelect = obtenerNombreRallyActual();
                    if (currentRallyFromSelect === nombreRallyActivo) {
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

// CONSOLIDADO EN EL LISTENER PRINCIPAL DE ARRIBA

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
    
    // Función auxiliar para actualizar el indicador de forma segura
    const updateIndicator = (status, text, color) => {
        if (dbStatus && dbStatusText) {
            dbStatus.style.display = 'inline-block';
            dbStatus.style.background = color;
            dbStatusText.textContent = text;
            console.log(`Indicador actualizado a: ${text}`);
        }
    };
    
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
            
            updateIndicator(dbStatus, 'Base de Datos', 'linear-gradient(135deg, #28a745, #20c997)');
        } catch (error) {
            console.log('❌ Error de conexión:', error);
            // En caso de error, usar modo local
            showNotification('Usando modo local - datos de prueba', 'info');
            
            updateIndicator(dbStatus, 'Modo Local', 'linear-gradient(135deg, #ffc107, #fd7e14)');
        }
    } else {
        console.log('❌ Supabase no disponible - usando modo local');
        showNotification('Modo local - usando datos de prueba', 'info');
        
        updateIndicator(dbStatus, 'Modo Local', 'linear-gradient(135deg, #ffc107, #fd7e14)');
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
            
            // ACTUALIZAR localStorage con los datos de Supabase
            const autosInfo = {};
            pilotosData.forEach(piloto => {
                const numeroAuto = String(piloto.numero_auto);
                autosInfo[numeroAuto] = {
                    piloto: piloto.piloto,
                    navegante: piloto.navegante,
                    clase: piloto.clase
                };
            });
            localStorage.setItem('autos_info', JSON.stringify(autosInfo));
            console.log('💾 Datos de pilotos actualizados en localStorage:', autosInfo);
            
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
            
            // Obtener rally activo actual usando función helper
            const nombreRallyActivo = obtenerNombreRallyActual();
            
            // Cargar datos FILTRADOS por rally
            let query = window.supabaseClient
                .from('tiempos_rally')
                .select('*');
            
            if (nombreRallyActivo) {
                query = query.eq('nombre_rally', nombreRallyActivo);
            }
            
            let { data: tiempos, error } = await query;
            
            console.log('Resultado de Supabase:', { 
                tiempos: tiempos?.length || 0, 
                error: error?.message || 'Sin error',
                rally: nombreRallyActivo 
            });
            
            if (error) {
                console.error('Error de Supabase:', error);
                // Si falla, intentar con una consulta más simple
                let querySimple = window.supabaseClient
                    .from('tiempos_rally')
                    .select('id, numero_auto, prueba, tiempo');
                
                if (nombreRallyActivo) {
                    querySimple = querySimple.eq('nombre_rally', nombreRallyActivo);
                }
                
                const { data: tiemposSimple, error: errorSimple } = await querySimple;
                
                if (errorSimple) {
                    throw errorSimple;
                }
                tiempos = tiemposSimple;
            }
            
            tiemposData = tiempos || [];
            console.log('✅ Tiempos cargados desde Supabase:', tiemposData.length, 'para el rally:', nombreRallyActivo);
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
        
        // Ordenar pilotos por número de forma numérica (no alfabética)
        const pilotosOrdenados = [...pilotosData].sort((a, b) => {
            const numA = parseInt(a.numero_auto) || 0;
            const numB = parseInt(b.numero_auto) || 0;
            return numA - numB;
        });
        
        pilotosOrdenados.forEach(piloto => {
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
        
        // Obtener rally activo actual usando función helper
        const nombreRallyActivo = obtenerNombreRallyActual();
        
        // Filtrar tiempos por rally y obtener pruebas únicas
        const tiemposFiltrados = nombreRallyActivo ? 
            allTiempos.filter(t => t.nombre_rally === nombreRallyActivo) : 
            allTiempos;
        
        if (!tiemposFiltrados || tiemposFiltrados.length === 0) {
            console.log('No hay datos de tiempos disponibles para este rally');
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No hay pruebas disponibles para este rally";
            option.disabled = true;
            pruebaSelect.appendChild(option);
            return;
        }
        
        // Obtener pruebas únicas del rally actual
        const pruebasUnicas = [...new Set(tiemposFiltrados.map(t => t.prueba).filter(prueba => prueba))].sort();
        
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
            // Limpiar selección de prueba cuando cambia el piloto
            if (pruebaSelect) {
                pruebaSelect.value = '';
            }
            // Poblar pruebas del piloto seleccionado
            if (this.value) {
                populatePruebaSelectForPilot(this.value);
            } else {
                // Si no hay piloto seleccionado, poblar todas las pruebas
                populatePruebaSelect();
            }
            hideTimeDisplays();
        });
    }
    
    if (pruebaSelect) {
        pruebaSelect.addEventListener('change', function() {
            if (pilotSelect && pilotSelect.value) {
                loadPilotTimes();
            }
        });
    }
    
    // Agregar listener para los radio buttons de operación
    const operationRadios = document.getElementsByName('operation');
    operationRadios.forEach(radio => {
        radio.addEventListener('change', updateTimePreview);
    });
}

// Poblar el select de pruebas con las pruebas del piloto seleccionado
function populatePruebaSelectForPilot(numeroAuto) {
    const pruebaSelect = document.getElementById('prueba-select');
    
    if (!pruebaSelect) {
        return;
    }
    
    // Limpiar select
    pruebaSelect.innerHTML = '<option value="">Selecciona una prueba</option>';
    
    if (!numeroAuto) {
        return;
    }
    
    // Convertir numeroAuto a string para comparación consistente
    const numeroAutoStr = String(numeroAuto);
    
    // Obtener rally activo actual usando función helper
    const nombreRallyActivo = obtenerNombreRallyActual();
    
    // Verificar que allTiempos tiene datos
    if (!allTiempos || allTiempos.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Cargando tiempos...";
        option.disabled = true;
        pruebaSelect.appendChild(option);
        // Intentar recargar datos
        setTimeout(() => {
            connectAndLoad().then(() => {
                populatePruebaSelectForPilot(numeroAuto);
            });
        }, 1000);
        return;
    }
    
    // Filtrar tiempos por rally y número de auto (usar comparación flexible de tipos)
    const tiemposFiltrados = (nombreRallyActivo ? 
        allTiempos.filter(t => t.nombre_rally === nombreRallyActivo) : 
        allTiempos).filter(t => {
            // Comparación flexible: convertir ambos a string para comparar
            const tNumero = String(t.numero_auto);
            return tNumero === numeroAutoStr;
        });
    
    if (!tiemposFiltrados || tiemposFiltrados.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Este piloto no tiene tiempos registrados";
        option.disabled = true;
        pruebaSelect.appendChild(option);
        return;
    }
    
    // Obtener pruebas únicas del piloto
    const pruebasUnicas = [...new Set(tiemposFiltrados.map(t => t.prueba).filter(prueba => prueba))].sort();
    
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
}

// Cargar tiempos del piloto seleccionado
function loadPilotTimes() {
    const pilotSelect = document.getElementById('pilot-select');
    const pruebaSelect = document.getElementById('prueba-select');
    
    if (!pilotSelect || !pruebaSelect) {
        return;
    }
    
    const numeroAuto = pilotSelect.value;
    const prueba = pruebaSelect.value;
    
    // Si solo hay piloto seleccionado pero no prueba, poblar pruebas del piloto
    if (numeroAuto && !prueba) {
        populatePruebaSelectForPilot(numeroAuto);
        hideTimeDisplays();
        return;
    }
    
    if (!numeroAuto || !prueba) {
        hideTimeDisplays();
        return;
    }
    
    // Obtener rally activo actual usando función helper
    const nombreRallyActivo = obtenerNombreRallyActual();
    
    // Usar allTiempos (ya filtrado por rally) en lugar de tiemposData
    const tiemposFiltrados = nombreRallyActivo ? 
        allTiempos.filter(t => t.nombre_rally === nombreRallyActivo) : 
        allTiempos;
    
    // Buscar el tiempo del piloto en la prueba seleccionada
    const tiempoEncontrado = tiemposFiltrados.find(t => {
        const tNumero = String(t.numero_auto);
        const numeroAutoStr = String(numeroAuto);
        return tNumero === numeroAutoStr && 
               t.prueba === prueba && 
               (!nombreRallyActivo || t.nombre_rally === nombreRallyActivo);
    });
    
    if (tiempoEncontrado) {
        // Extraer el tiempo del campo correcto
        let tiempo = tiempoEncontrado.tiempo_transcurrido || 
                    tiempoEncontrado.tiempo_segundos ||
                    '00:00.000';
        
        // Si el tiempo está en segundos, convertirlo a formato MM:SS.mmm
        if (typeof tiempo === 'number') {
            tiempo = formatTime(tiempo);
        }
        
        currentPilotTimes = {
            numero_auto: numeroAuto,
            prueba: prueba,
            tiempo: tiempo,
            id: tiempoEncontrado.id || tiempoEncontrado.largada_id || tiempoEncontrado.llegada_id
        };
        
        showCurrentTime(tiempo);
        updateTimePreview();
    } else {
        const rallyInfo = nombreRallyActivo ? ` en el rally ${nombreRallyActivo}` : '';
        showNotification(`No se encontró tiempo para el auto ${numeroAuto} en ${prueba}${rallyInfo}`, 'warning');
        hideTimeDisplays();
    }
}

// Mostrar tiempo actual
function showCurrentTime(tiempo) {
    const timeDisplaysContainer = document.getElementById('time-displays-container');
    const currentTimeDisplay = document.getElementById('current-time-display');
    const currentTimeSpan = document.getElementById('current-time');
    
    if (currentTimeDisplay && currentTimeSpan) {
        // Formatear el tiempo para mostrar
        const formattedTime = formatTimeForDisplay(tiempo);
        currentTimeSpan.textContent = formattedTime;
        
        // Mostrar el contenedor principal
        if (timeDisplaysContainer) {
            timeDisplaysContainer.style.display = 'block';
        }
        
        currentTimeDisplay.style.display = 'block';
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
    if (!currentPilotTimes.tiempo) {
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
    
    // Mostrar vista previa solo si hay cambios
    const previewTimeDisplay = document.getElementById('preview-time-display');
    const previewTimeSpan = document.getElementById('preview-time');
    
    const hasChanges = minutes !== 0 || seconds !== 0 || milliseconds !== 0;
    
    if (previewTimeDisplay && previewTimeSpan) {
        if (hasChanges) {
            const formattedTime = formatTimeForDisplay(newTime);
            previewTimeSpan.textContent = formattedTime;
            previewTimeDisplay.style.display = 'block';
            console.log('✅ Vista previa mostrada:', formattedTime);
        } else {
            previewTimeDisplay.style.display = 'none';
        }
    }
    
    // Habilitar botón de aplicar si hay cambios
    const applyBtn = document.getElementById('apply-btn');
    if (applyBtn) {
        applyBtn.disabled = !hasChanges;
    }
}

// Aplicar modificación de tiempo
async function applyTimeModification() {
    // Verificar que el rally esté activo
    const rallySelect = document.getElementById('rally-select');
    const rallyId = rallySelect?.value;
    const rally = rallyesData.find(r => r.id == rallyId);
    
    if (rally && !rally.activo) {
        showNotification('No se pueden modificar tiempos de rallyes finalizados', 'error');
        return;
    }
    
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
        // Verificar que el tiempo existe y no es null/undefined
        if (!currentPilotTimes.tiempo || currentPilotTimes.tiempo === 'null' || currentPilotTimes.tiempo === 'undefined') {
            showNotification('Error: No se encontró tiempo válido para modificar', 'error');
            return;
        }
        
        // Convertir tiempo actual a segundos
        const currentTimeInSeconds = timeToSeconds(currentPilotTimes.tiempo);
        
        // Verificar que la conversión fue exitosa
        if (isNaN(currentTimeInSeconds) || currentTimeInSeconds === 0) {
            showNotification('Error: Formato de tiempo inválido', 'error');
            return;
        }
        
        // Calcular ajuste en segundos
        const adjustmentInSeconds = (minutes * 60) + seconds + (milliseconds / 100);
        
        // Aplicar operación (sumar o restar)
        const operation = Array.from(document.getElementsByName('operation')).find(radio => radio.checked)?.value || 'add';
        let newTimeInSeconds;
        let adjustmentForLlegada; // Ajuste para la hora de llegada (considerando la operación)
        
        if (operation === 'add') {
            newTimeInSeconds = currentTimeInSeconds + adjustmentInSeconds;
            adjustmentForLlegada = adjustmentInSeconds; // Sumar tiempo = sumar a la hora de llegada
        } else {
            newTimeInSeconds = currentTimeInSeconds - adjustmentInSeconds;
            adjustmentForLlegada = -adjustmentInSeconds; // Restar tiempo = restar a la hora de llegada
        }
        
        // Asegurar que no sea negativo
        if (newTimeInSeconds < 0) {
            newTimeInSeconds = 0;
        }
        
        const newTime = secondsToTime(newTimeInSeconds);
        
        // Obtener rally activo actual usando función helper (definir antes de usar en múltiples lugares)
        const nombreRallyActivo = obtenerNombreRallyActual();
        
        // Filtrar tiempos por rally (definir antes de usar en múltiples lugares)
        const tiemposFiltrados = nombreRallyActivo ? 
            allTiempos.filter(t => t.nombre_rally === nombreRallyActivo) : 
            allTiempos;
        
        // Actualizar en Supabase - actualizar hora_llegada en tabla llegadas
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient !== null) {
            
            // Buscar el registro completo filtrando por rally
            const tiempoCompleto = tiemposFiltrados.find(t => {
                const tNumero = String(t.numero_auto);
                const numeroAutoStr = String(currentPilotTimes.numero_auto);
                return tNumero === numeroAutoStr && 
                       t.prueba === currentPilotTimes.prueba &&
                       (!nombreRallyActivo || t.nombre_rally === nombreRallyActivo);
            });
            
            if (!tiempoCompleto) {
                throw new Error(`No se encontró el registro para actualizar en el rally ${nombreRallyActivo || 'actual'}`);
            }
            
            // Obtener la hora_llegada actual y calcular la nueva
            const llegadaId = tiempoCompleto.llegada_id;
            
            if (!llegadaId) {
                throw new Error('No se encontró llegada_id en el registro');
            }
            
            // Buscar la llegada actual para obtener la hora exacta
            const { data: llegada, error: llegadaError } = await window.supabaseClient
                .from('llegadas')
                .select('hora_llegada')
                .eq('id', llegadaId)
                .single();
            
            if (llegadaError || !llegada) {
                throw new Error('No se pudo obtener la hora de llegada actual: ' + (llegadaError?.message || 'Registro no encontrado'));
            }
            
            // Convertir hora_llegada a segundos, aplicar ajuste (considerando la operación), convertir de vuelta
            const horaActualSeg = timeToSeconds(llegada.hora_llegada);
            const nuevaHoraSeg = horaActualSeg + adjustmentForLlegada; // Usar adjustmentForLlegada que ya tiene el signo correcto
            
            // Asegurar que la nueva hora no sea negativa
            if (nuevaHoraSeg < 0) {
                throw new Error('La operación resultaría en una hora de llegada negativa');
            }
            
            const nuevaHoraLlegada = secondsToTime(nuevaHoraSeg);
            
            // Actualizar hora_llegada en la tabla llegadas
            const { error: updateError } = await window.supabaseClient
                .from('llegadas')
                .update({ 
                    hora_llegada: nuevaHoraLlegada
                })
                .eq('id', llegadaId);
            
            if (updateError) {
                throw new Error('Error actualizando hora_llegada: ' + updateError.message);
            }
        }
        
        // También actualizar en localStorage como respaldo (filtrando por rally)
        const storedData = localStorage.getItem('tiempos_rally');
        if (storedData) {
            const data = JSON.parse(storedData);
            const dataFiltrados = nombreRallyActivo ? 
                data.filter(t => t.nombre_rally === nombreRallyActivo) : 
                data;
            const index = data.findIndex(t => 
                (t.numero_auto === currentPilotTimes.numero_auto || t.numero_auto == currentPilotTimes.numero_auto) && 
                t.prueba === currentPilotTimes.prueba &&
                (!nombreRallyActivo || t.nombre_rally === nombreRallyActivo)
            );
            if (index !== -1) {
                data[index].tiempo_transcurrido = newTime;
                data[index].tiempo_segundos = newTimeInSeconds;
                localStorage.setItem('tiempos_rally', JSON.stringify(data));
            }
        } else {
            // Si no hay datos en localStorage, guardar los datos actuales
            localStorage.setItem('tiempos_rally', JSON.stringify(allTiempos));
        }
        
        // Actualizar datos locales (usando tiemposFiltrados)
        const tiempoIndex = tiemposFiltrados.findIndex(t => 
            (t.numero_auto === currentPilotTimes.numero_auto || t.numero_auto == currentPilotTimes.numero_auto) && 
            t.prueba === currentPilotTimes.prueba &&
            (!nombreRallyActivo || t.nombre_rally === nombreRallyActivo)
        );
        if (tiempoIndex !== -1) {
            tiemposFiltrados[tiempoIndex].tiempo_transcurrido = newTime;
            tiemposFiltrados[tiempoIndex].tiempo_segundos = newTimeInSeconds;
            tiemposFiltrados[tiempoIndex].tiempo = newTime;
            // Actualizar también en allTiempos
            const indexInAll = allTiempos.findIndex(t => 
                t.numero_auto == currentPilotTimes.numero_auto && 
                t.prueba === currentPilotTimes.prueba &&
                (!nombreRallyActivo || t.nombre_rally === nombreRallyActivo)
            );
            if (indexInAll !== -1) {
                allTiempos[indexInAll].tiempo_transcurrido = newTime;
                allTiempos[indexInAll].tiempo_segundos = newTimeInSeconds;
                allTiempos[indexInAll].tiempo = newTime;
            }
        }
        
        // Guardar el tiempo anterior para la notificación
        const tiempoAnterior = currentPilotTimes.tiempo;
        
        // Recargar datos desde Supabase para obtener los valores actualizados
        await connectAndLoad();
        
        // Actualizar currentPilotTimes con el nuevo tiempo
        currentPilotTimes.tiempo = newTime;
        
        // Mostrar el nuevo tiempo actualizado
        showCurrentTime(newTime);
        
        // Recargar el tiempo del piloto para asegurar que tenemos los datos más recientes
        setTimeout(async () => {
            await loadPilotTimes();
            updateTimePreview();
        }, 500);
        
        showNotification(`Tiempo actualizado: ${tiempoAnterior} → ${newTime}`, 'success');
        resetTimeModifier();
        
    } catch (error) {
        showNotification('Error aplicando modificación de tiempo: ' + (error.message || error), 'error');
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
    
    // Ocultar vista previa pero mantener el tiempo actual visible
    const previewTimeDisplay = document.getElementById('preview-time-display');
    if (previewTimeDisplay) {
        previewTimeDisplay.style.display = 'none';
    }
}

// Ocultar displays de tiempo
function hideTimeDisplays() {
    const timeDisplaysContainer = document.getElementById('time-displays-container');
    const currentTimeDisplay = document.getElementById('current-time-display');
    const previewTimeDisplay = document.getElementById('preview-time-display');
    
    if (timeDisplaysContainer) timeDisplaysContainer.style.display = 'none';
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

// Forzar actualización del indicador de conexión
function updateConnectionIndicator() {
    const dbStatus = document.getElementById('database-status');
    const dbStatusText = document.getElementById('db-status-text');
    
    console.log('Actualizando indicador de conexión...');
    console.log('Elementos encontrados:', { dbStatus: !!dbStatus, dbStatusText: !!dbStatusText });
    
    // Verificar que los elementos existen ANTES de usarlos
    if (!dbStatus || !dbStatusText) {
        console.log('❌ Elementos del DOM no disponibles aún, reintentando...');
        // Esperar 500ms y reintentar
        setTimeout(() => updateConnectionIndicator(), 500);
        return;
    }
    
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

// Función principal para actualizar tiempo
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

// ==================== FUNCIONES DE GESTIÓN DE IMÁGENES ====================

// Función para subir imagen a Supabase Storage
async function subirImagenRally(file, rallyId, nombreRally) {
    try {
        if (!window.supabaseClient) {
            throw new Error('No hay conexión a Supabase');
        }

        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo debe ser una imagen');
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('La imagen es demasiado grande (máximo 5MB)');
        }

        // Crear nombre único para el archivo (usar nombre del rally para organización)
        const nombreLimpio = nombreRally.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const fileExt = file.name.split('.').pop();
        const fileName = `${nombreLimpio}_${rallyId}_${Date.now()}.${fileExt}`;
        const filePath = `rallyes/${fileName}`;

        // Subir a Supabase Storage
        const { data, error } = await window.supabaseClient.storage
            .from('rallyes')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Obtener URL pública
        const { data: urlData } = window.supabaseClient.storage
            .from('rallyes')
            .getPublicUrl(filePath);

        return urlData.publicUrl;
        
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        throw error;
    }
}

// Función para mostrar la imagen del rally seleccionado
function mostrarImagenRally(rally) {
    const fotoPreview = document.getElementById('foto-preview');
    const fotoPreviewImg = document.getElementById('foto-preview-img');
    const fotoNuevaPreview = document.getElementById('foto-nueva-preview');
    
    if (!fotoPreview || !fotoPreviewImg) return;
    
    // Ocultar preview de nueva imagen si existe
    if (fotoNuevaPreview) {
        fotoNuevaPreview.style.display = 'none';
    }
    
    // Mostrar imagen actual si existe
    if (rally && rally.foto_url) {
        fotoPreviewImg.src = rally.foto_url;
        fotoPreview.style.display = 'block';
    } else {
        fotoPreview.style.display = 'none';
    }
}

// ==================== FUNCIONES DE GESTIÓN DE RALLYES ====================

// Función para cargar rallyes desde Supabase
async function loadRallyes() {
    try {
        if (!window.supabaseClient) {
            console.warn('Supabase no inicializado');
            return;
        }
        
        const { data, error } = await window.supabaseClient
            .from('rallyes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        rallyesData = data || [];
        
        // Llenar el select de rallyes
        const rallySelect = document.getElementById('rally-select');
        if (rallySelect) {
            rallySelect.innerHTML = '';
            
            rallyesData.forEach(rally => {
                const option = document.createElement('option');
                option.value = rally.id;
                option.textContent = rally.nombre;
                option.dataset.nombre = rally.nombre;
                if (rally.activo) {
                    option.selected = true;
                    rallyActivoActual = rally.nombre;
                }
                rallySelect.appendChild(option);
            });
            
            // Cargar foto y nombre del rally activo
            const rallyActivo = rallyesData.find(r => r.activo);
            const fotoInput = document.getElementById('rally-foto-input');
            const nombreInput = document.getElementById('rally-nombre-input');
            if (fotoInput && rallyActivo) {
                // Limpiar el input de archivo
                fotoInput.value = '';
                // Mostrar la imagen del rally activo
                mostrarImagenRally(rallyActivo);
            }
            if (nombreInput && rallyActivo) {
                nombreInput.value = rallyActivo.nombre || '';
            }
        }
        
        // Cargar rallyes finalizados
        loadRallyesFinalizados();
        
    } catch (error) {
        console.error('Error cargando rallyes:', error);
    }
}

// Función para cargar rallyes finalizados
function loadRallyesFinalizados() {
    const container = document.getElementById('rallyes-finalizados');
    if (!container) return;
    
    const rallyesFinalizados = rallyesData.filter(r => !r.activo);
    
    if (rallyesFinalizados.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">No hay rallyes finalizados</p>';
        return;
    }
    
    container.innerHTML = rallyesFinalizados.map(rally => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
            <div>
                <strong>${rally.nombre}</strong>
                <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0 0;">
                    ${rally.fecha_fin ? 'Finalizado: ' + new Date(rally.fecha_fin).toLocaleDateString('es-AR') : 'Sin fecha'}
                </p>
            </div>
            <button onclick="activarRally(${rally.id})" class="btn btn-sm" style="font-size: 12px;">
                <i class="fas fa-redo"></i> Activar
            </button>
        </div>
    `).join('');
}

// Función para actualizar el rally
window.actualizarRally = async function() {
    try {
        const rallySelect = document.getElementById('rally-select');
        const rallyFoto = document.getElementById('rally-foto-input');
        const rallyNombre = document.getElementById('rally-nombre-input');
        
        if (!rallySelect || !rallyFoto || !rallyNombre) return;
        
        const rallyId = rallySelect.value;
        const nombre = rallyNombre.value.trim();
        
        if (!rallyId) {
            showNotification('Por favor selecciona un rally', 'warning');
            return;
        }
        
        if (!nombre) {
            showNotification('Por favor ingresa un nombre para el rally', 'warning');
            return;
        }
        
        if (!window.supabaseClient) {
            showNotification('Error: No hay conexión a Supabase', 'error');
            return;
        }

        let fotoUrl = null;
        
        // Si hay un archivo seleccionado, subirlo
        if (rallyFoto.files && rallyFoto.files.length > 0) {
            const file = rallyFoto.files[0];
            
            showNotification('Subiendo imagen...', 'info');
            
            try {
                // Subir nueva imagen (NO eliminamos la anterior, cada rally mantiene su imagen)
                fotoUrl = await subirImagenRally(file, rallyId, nombre);
                showNotification('Imagen subida correctamente', 'success');
            } catch (error) {
                showNotification('Error al subir imagen: ' + error.message, 'error');
                return;
            }
        } else {
            // No hay archivo nuevo, mantener la URL actual del rally
            const rallyActual = rallyesData.find(r => r.id === parseInt(rallyId));
            fotoUrl = rallyActual?.foto_url || '';
        }
        
        // Actualizar el rally
        const updateData = {
            nombre: nombre,
            foto_url: fotoUrl,
            updated_at: new Date().toISOString()
        };
        
        const { error } = await window.supabaseClient
            .from('rallyes')
            .update(updateData)
            .eq('id', rallyId);
        
        if (error) throw error;
        
        showNotification('Rally actualizado correctamente', 'success');
        await loadRallyes(); // Recargar para actualizar la vista
        
    } catch (error) {
        console.error('Error actualizando rally:', error);
        showNotification('Error al actualizar el rally', 'error');
    }
};

// Función para finalizar un rally
window.finalizarRally = async function() {
    try {
        const rallySelect = document.getElementById('rally-select');
        if (!rallySelect || !rallySelect.value) return;
        
        if (!confirm('¿Estás seguro de que quieres finalizar este rally?')) return;
        
        const rallyId = rallySelect.value;
        
        if (!window.supabaseClient) {
            showNotification('Error: No hay conexión a Supabase', 'error');
            return;
        }
        
        const { error } = await window.supabaseClient
            .from('rallyes')
            .update({
                activo: false,
                fecha_fin: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            })
            .eq('id', rallyId);
        
        if (error) throw error;
        
        showNotification('Rally finalizado correctamente', 'success');
        
        // Recargar rallyes y seleccionar automáticamente el rally activo
        await loadRallyes();
        
        // Seleccionar automáticamente el rally activo después de finalizar
        const rallySelectElement = document.getElementById('rally-select');
        if (rallySelectElement) {
            const rallyActivo = rallyesData.find(r => r.activo);
            if (rallyActivo) {
                rallySelectElement.value = rallyActivo.id;
                rallyActivoActual = rallyActivo.nombre;
                
                // Actualizar inputs
                const fotoInput = document.getElementById('rally-foto-input');
                const nombreInput = document.getElementById('rally-nombre-input');
                if (fotoInput) {
                    fotoInput.value = '';
                    mostrarImagenRally(rallyActivo);
                }
                if (nombreInput) nombreInput.value = rallyActivo.nombre || '';
                
                // Recargar datos del nuevo rally
                await connectAndLoad();
            }
        }
        
    } catch (error) {
        console.error('Error finalizando rally:', error);
        showNotification('Error al finalizar el rally', 'error');
    }
};

// Función para activar un rally finalizado
window.activarRally = async function(rallyId) {
    try {
        if (!confirm('¿Activar este rally? El rally actual será desactivado.')) return;
        
        if (!window.supabaseClient) {
            showNotification('Error: No hay conexión a Supabase', 'error');
            return;
        }
        
        // Desactivar todos los rallyes
        await window.supabaseClient
            .from('rallyes')
            .update({ activo: false })
            .eq('activo', true);
        
        // Activar el seleccionado
        const { error } = await window.supabaseClient
            .from('rallyes')
            .update({
                activo: true,
                fecha_inicio: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
            })
            .eq('id', rallyId);
        
        if (error) throw error;
        
        showNotification('Rally activado correctamente', 'success');
        loadRallyes();
        
        // Recargar datos filtrados por el nuevo rally
        await connectAndLoad();
        
    } catch (error) {
        console.error('Error activando rally:', error);
        showNotification('Error al activar el rally', 'error');
    }
};

// Función para crear un nuevo rally
window.crearRally = async function() {
    try {
        console.log('=== INICIANDO CREACIÓN DE RALLY ===');
        
        const nombreInput = document.getElementById('new-rally-nombre');
        if (!nombreInput) {
            console.error('No se encontró el input de nombre');
            showNotification('Error: No se encontró el campo de nombre', 'error');
            return;
        }
        
        const nombre = nombreInput.value.trim();
        console.log('Nombre del rally:', nombre);
        
        if (!nombre) {
            showNotification('Por favor ingresa un nombre para el rally', 'warning');
            return;
        }
        
        // Verificar si supabaseClient está disponible
        console.log('Verificando conexión a Supabase...');
        if (!window.supabaseClient) {
            console.error('supabaseClient no está disponible');
            showNotification('Error: No hay conexión a Supabase. Recarga la página.', 'error');
            return;
        }
        console.log('✅ Supabase cliente disponible');
        
        // Desactivar todos los rallyes actuales
        console.log('Desactivando rallyes anteriores...');
        const { error: updateError } = await window.supabaseClient
            .from('rallyes')
            .update({ activo: false })
            .eq('activo', true);
        
        if (updateError) {
            console.error('Error desactivando rallyes:', updateError);
            showNotification('Advertencia: No se pudieron desactivar los rallyes anteriores', 'warning');
        }
        
        // Crear el nuevo rally activo
        console.log('Creando nuevo rally:', nombre);
        const { data, error } = await window.supabaseClient
            .from('rallyes')
            .insert({
                nombre: nombre,
                foto_url: '',
                activo: true,
                fecha_inicio: new Date().toISOString().split('T')[0]
            })
            .select();
        
        if (error) {
            console.error('Error de Supabase:', error);
            
            // Manejo específico de errores conocidos
            if (error.code === '23505') {
                showNotification('Este nombre de rally ya existe. Por favor usa otro nombre.', 'warning');
            } else if (error.code === '42501') {
                showNotification('Error de permisos. Verifica la configuración de Supabase RLS.', 'error');
            } else {
                showNotification('Error al crear el rally: ' + (error.message || 'Error desconocido'), 'error');
            }
            throw error;
        }
        
        console.log('✅ Rally creado exitosamente:', data);
        showNotification('Rally creado y activado correctamente', 'success');
        
        // Limpiar input
        nombreInput.value = '';
        
        // Recargar rallyes
        console.log('Recargando lista de rallyes...');
        await loadRallyes();
        
        // Seleccionar automáticamente el rally recién creado
        const rallySelectElement = document.getElementById('rally-select');
        if (rallySelectElement && data && data.length > 0) {
            const nuevoRally = rallyesData.find(r => r.id === data[0].id);
            if (nuevoRally) {
                rallySelectElement.value = nuevoRally.id;
                rallyActivoActual = nuevoRally.nombre;
                console.log('Rally seleccionado:', nuevoRally.nombre);
                
                // Actualizar inputs
                const fotoInput = document.getElementById('rally-foto-input');
                const nombreInputField = document.getElementById('rally-nombre-input');
                if (fotoInput) {
                    fotoInput.value = '';
                    mostrarImagenRally(nuevoRally);
                }
                if (nombreInputField) nombreInputField.value = nuevoRally.nombre || '';
            }
        }
        
        // Recargar datos
        console.log('Recargando datos generales...');
        await connectAndLoad();
        
        console.log('=== RALLY CREADO EXITOSAMENTE ===');
        
    } catch (error) {
        console.error('❌ Error creando rally:', error);
        console.error('Detalles del error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        showNotification('Error al crear el rally: ' + (error.message || 'Error desconocido'), 'error');
    }
};

// Asegurar que las funciones estén disponibles globalmente
