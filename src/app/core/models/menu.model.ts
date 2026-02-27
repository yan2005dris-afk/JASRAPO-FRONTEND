export interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    route?: string;
    children?: MenuItem[];
    expanded?: boolean;  // Estado de expansión en el sidebar
}

export interface MenuConfig {
    items: MenuItem[];
}