import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ymcfzcljdxtujgiaiqki.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltY2Z6Y2xqZHh0dWpnaWFpcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDYzOTIsImV4cCI6MjA3NTUyMjM5Mn0.BsjAqaqgC64tTzNvx1HZc1exWSZEs5znLFKl2Ucp8u4'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Funciones para obtener datos de Supabase
export const getTiemposRally = async (nombreRally = null, prueba = null) => {
  try {
    let query = supabase
      .from('tiempos_rally')
      .select('*')
      .order('tiempo_segundos', { ascending: true })

    if (nombreRally) {
      query = query.eq('nombre_rally', nombreRally)
    }
    
    if (prueba) {
      query = query.eq('prueba', prueba)
    }

    const { data, error } = await query
    
    if (error) {
      console.error('Error obteniendo tiempos:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error en getTiemposRally:', error)
    return []
  }
}

export const getRallies = async () => {
  try {
    const { data, error } = await supabase
      .from('tiempos_rally')
      .select('nombre_rally')
      .order('nombre_rally')
    
    if (error) {
      console.error('Error obteniendo rallies:', error)
      return []
    }
    
    // Obtener valores únicos
    const rallies = [...new Set(data.map(item => item.nombre_rally))]
    return rallies
  } catch (error) {
    console.error('Error en getRallies:', error)
    return []
  }
}

export const getPruebas = async (nombreRally = null) => {
  try {
    let query = supabase
      .from('tiempos_rally')
      .select('prueba')
      .order('prueba')
    
    if (nombreRally) {
      query = query.eq('nombre_rally', nombreRally)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error obteniendo pruebas:', error)
      return []
    }
    
    // Obtener valores únicos
    const pruebas = [...new Set(data.map(item => item.prueba))]
    return pruebas
  } catch (error) {
    console.error('Error en getPruebas:', error)
    return []
  }
}
