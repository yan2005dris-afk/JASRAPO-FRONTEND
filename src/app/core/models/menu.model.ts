/**
 * MenuItem interface que coincide con la estructura del backend
 */
export type MenuNavContext = 'admin' | 'operator' | 'common';

export interface MenuItem {
  id: number; // ID del menú en la base de datos
  name: string; // Nombre del menú (antes era 'label')
  route?: string; // Ruta de navegación (nullable)
  icon?: string; // Icono del menú (nullable)
  parent_menu_id?: number; // ID del menú padre (nullable, para jerarquía)
  menu_order: number; // Orden de visualización
  is_active: boolean; // Estado activo/inactivo
  created_at?: string; // Fecha de creación (timestamp)
  children?: MenuItem[]; // Submenús (calculado en backend o frontend)
  expanded?: boolean; // Estado de expansión en el sidebar (solo UI)

  // Metadatos unificados para navegación responsive y control de contexto
  showInBottomNav?: boolean; // Indicador de visibilidad en bottom navigation móvil
  bottomNavOrder?: number; // Orden de prioridad en barra inferior móvil
  context?: MenuNavContext; // Contexto de la ruta: admin, operator o common
  badgeSignalKey?: 'syncQueued' | 'syncPending'; // Clave para badges reactivos
}

export interface MenuConfig {
  items: MenuItem[];
}

