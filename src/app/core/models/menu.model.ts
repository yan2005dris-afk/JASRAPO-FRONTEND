export interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    route?: string;
    children?: MenuItem[];
    roles: string[];  // Roles que pueden ver este item
    expanded?: boolean;
}

export interface MenuConfig {
    items: MenuItem[];
}