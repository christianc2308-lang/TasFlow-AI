/**
 * Datos de ejemplo para la primera versión (todavía sin backend).
 * Las fechas son relativas a hoy para que la demo siempre tenga
 * tareas próximas y alguna vencida.
 */

import { diasDesdeHoy } from '../utils/formato.js';

export const TAREAS_INICIALES = [
  {
    id: 1,
    titulo: 'Diseñar el dashboard principal',
    descripcion: 'Maquetar la vista con tarjetas de estadísticas y tabla de tareas.',
    responsable: 'Christian C.',
    prioridad: 'alta',
    estado: 'completada',
    fechaLimite: diasDesdeHoy(-3),
  },
  {
    id: 2,
    titulo: 'Definir el modelo de base de datos',
    descripcion: 'Tablas de usuarios, proyectos, tareas y etiquetas.',
    responsable: 'Laura Méndez',
    prioridad: 'urgente',
    estado: 'en_progreso',
    fechaLimite: diasDesdeHoy(2),
  },
  {
    id: 3,
    titulo: 'Integrar Google Calendar',
    descripcion: 'Sincronizar las fechas límite con el calendario del usuario.',
    responsable: 'Diego Ramos',
    prioridad: 'media',
    estado: 'pendiente',
    fechaLimite: diasDesdeHoy(10),
  },
  {
    id: 4,
    titulo: 'Configurar workflow de n8n',
    descripcion: 'Aviso automático cuando se registra una nueva tarea.',
    responsable: 'Christian C.',
    prioridad: 'alta',
    estado: 'en_progreso',
    fechaLimite: diasDesdeHoy(4),
  },
  {
    id: 5,
    titulo: 'Revisar accesibilidad del formulario',
    descripcion: 'Etiquetas, contraste y navegación con teclado.',
    responsable: 'Ana Torres',
    prioridad: 'baja',
    estado: 'pendiente',
    fechaLimite: diasDesdeHoy(-1),
  },
  {
    id: 6,
    titulo: 'Redactar documentación del proyecto',
    descripcion: 'README con instalación, estructura de carpetas y convenciones.',
    responsable: 'Laura Méndez',
    prioridad: 'media',
    estado: 'completada',
    fechaLimite: diasDesdeHoy(-6),
  },
  {
    id: 7,
    titulo: 'Preparar la demo del sprint',
    descripcion: 'Presentación de avances para el equipo.',
    responsable: 'Diego Ramos',
    prioridad: 'urgente',
    estado: 'pendiente',
    fechaLimite: diasDesdeHoy(1),
  },
];
