/**
 * Sistema Rally AVGR - JavaScript Principal
 * Funcionalidades comunes para toda la aplicación
 */

// Configuración global
const CONFIG = {
    refreshInterval: 5000, // 5 segundos
    apiTimeout: 10000, // 10 segundos
    maxRetries: 3
};

// Estado global de la aplicación
const AppState = {
    isOnline: navigator.onLine,
    lastUpdate: null,
    retryCount: 0,
    autoRefreshEnabled: true
};

/**
 * Utilidades generales
 */
const Utils = {
    // Formatear fecha y hora
    formatDateTime: function(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // Formatear tiempo en segundos a MM:SS.mmm
    formatTime: function(seconds) {
        if (!seconds) return '0:00.000';
        const minutes = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${minutes}:${secs.padStart(6, '0')}`;
    },

    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Mostrar notificación
    showNotification: function(message, type = 'info', duration = 3000) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
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
                    background: var(--secondary-color);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 15px 20px;
                    box-shadow: 0 5px 20px var(--shadow);
                    animation: slideInRight 0.3s ease;
                    max-width: 400px;
                }
                .notification-success { border-color: var(--success-color); }
                .notification-error { border-color: var(--error-color); }
                .notification-warning { border-color: var(--warning-color); }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    margin-left: auto;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto-remover después del tiempo especificado
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    },

    // Obtener icono para notificación
    getNotificationIcon: function(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    // Copiar texto al portapapeles
    copyToClipboard: function(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Copiado al portapapeles', 'success');
            }).catch(() => {
                this.showNotification('Error al copiar', 'error');
            });
        } else {
            // Fallback para navegadores más antiguos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showNotification('Copiado al portapapeles', 'success');
            } catch (err) {
                this.showNotification('Error al copiar', 'error');
            }
            document.body.removeChild(textArea);
        }
    }
};

/**
 * Gestión de conexión
 */
const ConnectionManager = {
    // Verificar estado de conexión
    checkConnection: function() {
        return new Promise((resolve) => {
            // Para archivos locales, asumir conexión exitosa
            AppState.isOnline = true;
            AppState.retryCount = 0;
            this.updateConnectionStatus(true);
            console.log('✅ Conexión local establecida');
            resolve(true);
        });
    },

    // Actualizar indicador de estado de conexión
    updateConnectionStatus: function(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (connected) {
                statusElement.className = 'status-indicator connected';
                statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Conectado</span>';
            } else {
                statusElement.className = 'status-indicator disconnected';
                statusElement.innerHTML = '<i class="fas fa-circle"></i><span>Desconectado</span>';
            }
        }
    },

    // Reintentar conexión
    retryConnection: function() {
        if (AppState.retryCount < CONFIG.maxRetries) {
            Utils.showNotification(`Reintentando conexión... (${AppState.retryCount}/${CONFIG.maxRetries})`, 'warning');
            setTimeout(() => {
                this.checkConnection();
            }, 2000);
        } else {
            Utils.showNotification('No se puede conectar al servidor. Verifica tu conexión.', 'error', 5000);
        }
    }
};

/**
 * Gestión de auto-refresh
 */
const AutoRefresh = {
    interval: null,

    // Iniciar auto-refresh
    start: function() {
        if (this.interval) {
            clearInterval(this.interval);
        }

        this.interval = setInterval(() => {
            if (AppState.autoRefreshEnabled && AppState.isOnline) {
                this.refreshData();
            }
        }, CONFIG.refreshInterval);

        console.log('Auto-refresh iniciado');
    },

    // Parar auto-refresh
    stop: function() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log('Auto-refresh detenido');
    },

    // Refrescar datos
    refreshData: function() {
        if (document.hidden) return; // No refrescar si la página no está visible

        // Actualizar indicador de refresh
        this.updateRefreshIndicator();

        // Si estamos en la página de tiempos, recargar
        if (window.location.pathname === '/tiempos') {
            // En lugar de recargar toda la página, hacer una petición AJAX
            this.refreshTimesData();
        }
    },

    // Actualizar indicador de refresh
    updateRefreshIndicator: function() {
        const indicators = document.querySelectorAll('.auto-refresh, .spinning');
        indicators.forEach(indicator => {
            indicator.style.opacity = '0.7';
            setTimeout(() => {
                indicator.style.opacity = '1';
            }, 500);
        });
    },

    // Refrescar datos de tiempos vía AJAX
    refreshTimesData: function() {
        const currentUrl = new URL(window.location);
        const prueba = currentUrl.searchParams.get('prueba');
        const auto = currentUrl.searchParams.get('auto');

        let apiUrl = '/api/tiempos';
        const params = new URLSearchParams();
        if (prueba) params.append('prueba', prueba);
        if (auto) params.append('auto', auto);
        if (params.toString()) {
            apiUrl += '?' + params.toString();
        }

        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.updateTimesTable(data.data);
                }
            })
            .catch(error => {
                console.error('Error refrescando datos:', error);
            });
    },

    // Actualizar tabla de tiempos
    updateTimesTable: function(tiempos) {
        const tbody = document.querySelector('.results-table tbody');
        if (!tbody) return;

        // Limpiar tabla actual
        tbody.innerHTML = '';

        if (tiempos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <div class="no-data-content">
                            <i class="fas fa-info-circle"></i>
                            <h4>No hay tiempos registrados</h4>
                            <p>Los tiempos aparecerán aquí cuando se registren en el sistema</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Agregar nuevas filas
        tiempos.forEach((tiempo, index) => {
            const row = document.createElement('tr');
            row.className = `result-row ${index === 0 ? 'winner' : index < 3 ? 'podium' : ''}`;
            
            row.innerHTML = `
                <td class="position">
                    ${this.getPositionHTML(index + 1)}
                </td>
                <td class="auto">
                    <span class="auto-number">${tiempo.numero_auto}</span>
                </td>
                <td class="tiempo">
                    <span class="tiempo-value">${tiempo.tiempo_transcurrido}</span>
                </td>
                <td class="hora">
                    <span class="hora-value">${tiempo.hora_largada}</span>
                </td>
                <td class="hora">
                    <span class="hora-value">${tiempo.hora_llegada}</span>
                </td>
                <td class="prueba">
                    <span class="prueba-name">${tiempo.prueba}</span>
                </td>
                <td class="fecha">
                    <span class="fecha-value">${tiempo.fecha}</span>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Animar filas
        this.animateRows();
    },

    // Obtener HTML para posición
    getPositionHTML: function(position) {
        if (position === 1) {
            return `
                <div class="position-medal gold">
                    <i class="fas fa-trophy"></i>
                    <span class="position-text">1º</span>
                </div>
            `;
        } else if (position === 2) {
            return `
                <div class="position-medal silver">
                    <i class="fas fa-medal"></i>
                    <span class="position-text">2º</span>
                </div>
            `;
        } else if (position === 3) {
            return `
                <div class="position-medal bronze">
                    <i class="fas fa-medal"></i>
                    <span class="position-text">3º</span>
                </div>
            `;
        } else {
            return `<span class="position-number">${position}</span>`;
        }
    },

    // Animar filas
    animateRows: function() {
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
};

/**
 * Gestión de estadísticas
 */
const StatsManager = {
    // Cargar estadísticas
    loadStats: function() {
        return fetch('/api/tiempos')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data.length > 0) {
                    this.updateStats(data.data);
                    return true;
                } else {
                    this.updateStats([]);
                    return false;
                }
            })
            .catch(error => {
                console.error('Error cargando estadísticas:', error);
                Utils.showNotification('Error cargando estadísticas', 'error');
                return false;
            });
    },

    // Actualizar estadísticas en la UI
    updateStats: function(tiempos) {
        if (tiempos.length === 0) {
            this.setStatValue('total-autos', '0');
            this.setStatValue('total-pruebas', '0');
            this.setStatValue('mejor-tiempo', '-');
            this.setStatValue('total-registros', '0');
            return;
        }

        const autos = new Set(tiempos.map(t => t.numero_auto));
        const pruebas = new Set(tiempos.map(t => t.prueba));
        const mejorTiempo = tiempos[0].tiempo_transcurrido;

        this.setStatValue('total-autos', autos.size);
        this.setStatValue('total-pruebas', pruebas.size);
        this.setStatValue('mejor-tiempo', mejorTiempo);
        this.setStatValue('total-registros', tiempos.length);
    },

    // Establecer valor de estadística
    setStatValue: function(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    },

    // Animar estadísticas
    animateStats: function() {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.classList.add('loading');
        });
        
        setTimeout(() => {
            statCards.forEach(card => {
                card.classList.remove('loading');
            });
        }, 1000);
    }
};

/**
 * Gestión de filtros
 */
const FilterManager = {
    // Aplicar filtros
    applyFilters: function() {
        const form = document.querySelector('.filters-form');
        if (form) {
            form.submit();
        }
    },

    // Limpiar filtros
    clearFilters: function() {
        window.location.href = '/tiempos';
    },

    // Actualizar filtros dinámicamente
    updateFilters: function() {
        // Esta función se puede expandir para filtros más dinámicos
        console.log('Actualizando filtros...');
    }
};

/**
 * Inicialización de la aplicación
 */
const App = {
    // Inicializar aplicación
    init: function() {
        console.log('🚀 Iniciando Sistema Rally AVGR...');
        
        this.setupEventListeners();
        this.checkInitialConnection();
        this.setupVisibilityHandling();
        this.setupErrorHandling();
        
        // Iniciar auto-refresh solo si estamos en la página de tiempos
        if (window.location.pathname === '/tiempos') {
            AutoRefresh.start();
        }
        
        console.log('✅ Aplicación inicializada correctamente');
    },

    // Configurar event listeners
    setupEventListeners: function() {
        // Event listener para cambios de conexión
        window.addEventListener('online', () => {
            AppState.isOnline = true;
            ConnectionManager.updateConnectionStatus(true);
            Utils.showNotification('Conexión restablecida', 'success');
            if (window.location.pathname === '/tiempos') {
                AutoRefresh.start();
            }
        });

        window.addEventListener('offline', () => {
            AppState.isOnline = false;
            ConnectionManager.updateConnectionStatus(false);
            Utils.showNotification('Conexión perdida', 'warning');
            AutoRefresh.stop();
        });

        // Event listener para teclas de acceso rápido
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        if (window.location.pathname === '/tiempos') {
                            AutoRefresh.refreshData();
                        }
                        break;
                    case 'h':
                        e.preventDefault();
                        window.location.href = '/';
                        break;
                    case 't':
                        e.preventDefault();
                        window.location.href = '/tiempos';
                        break;
                }
            }
        });

        // Event listener para clicks en elementos interactivos
        document.addEventListener('click', (e) => {
            // Botón de prueba de conexión
            if (e.target.closest('[onclick*="testConnection"]')) {
                e.preventDefault();
                this.testConnection();
            }
            
            // Botón de actualizar estadísticas
            if (e.target.closest('[onclick*="refreshStats"]')) {
                e.preventDefault();
                this.refreshStats();
            }
        });
    },

    // Verificar conexión inicial
    checkInitialConnection: function() {
        ConnectionManager.checkConnection().then(connected => {
            if (!connected) {
                ConnectionManager.retryConnection();
            }
        });
    },

    // Configurar manejo de visibilidad de página
    setupVisibilityHandling: function() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                AutoRefresh.stop();
            } else {
                if (window.location.pathname === '/tiempos') {
                    AutoRefresh.start();
                }
                // Refrescar datos cuando la página vuelve a ser visible
                ConnectionManager.checkConnection();
            }
        });
    },

    // Configurar manejo de errores globales
    setupErrorHandling: function() {
        window.addEventListener('error', (e) => {
            console.error('Error global:', e.error);
            Utils.showNotification('Ha ocurrido un error inesperado', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promise rechazada:', e.reason);
            Utils.showNotification('Error de conexión', 'error');
        });
    },

    // Probar conexión
    testConnection: function() {
        const button = event.target.closest('.btn, .action-card');
        const originalContent = button ? button.innerHTML : '';
        
        if (button) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';
            button.disabled = true;
        }

        ConnectionManager.checkConnection().then(connected => {
            if (connected) {
                Utils.showNotification('¡Conexión exitosa!', 'success');
                if (button) {
                    button.innerHTML = '<i class="fas fa-check"></i> ¡Conectado!';
                    button.classList.add('success');
                    setTimeout(() => {
                        button.innerHTML = originalContent;
                        button.classList.remove('success');
                        button.disabled = false;
                    }, 2000);
                }
            } else {
                Utils.showNotification('Error de conexión', 'error');
                if (button) {
                    button.innerHTML = '<i class="fas fa-times"></i> Error';
                    button.classList.add('error');
                    setTimeout(() => {
                        button.innerHTML = originalContent;
                        button.classList.remove('error');
                        button.disabled = false;
                    }, 2000);
                }
            }
        });
    },

    // Refrescar estadísticas
    refreshStats: function() {
        StatsManager.animateStats();
        StatsManager.loadStats().then(success => {
            if (success) {
                Utils.showNotification('Estadísticas actualizadas', 'success');
            }
        });
    }
};

// Funciones globales para compatibilidad con HTML
window.testConnection = App.testConnection.bind(App);
window.refreshStats = App.refreshStats.bind(App);

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Exportar para uso en otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, Utils, ConnectionManager, AutoRefresh, StatsManager };
}
