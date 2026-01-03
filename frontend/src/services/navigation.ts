/**
 * Navigation Service
 * Standardizes navigation terminology and structure according to Requirements 8.1, 8.2, 8.3
 */

export interface NavigationItem {
  id: string;
  path: string;
  icon: string;
  label: string;
  description: string;
  badge?: number | string;
  isActive?: boolean;
  isPrimary?: boolean;
  order: number;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

export interface NavigationState {
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
  activeSection: string;
}

// =============================================
// Standardized Navigation Configuration
// =============================================

/**
 * Primary Navigation Items (Requirements 8.2)
 * Order: Dashboard, Today (Queue), Call, Medications, Family, Timeline, Analytics, Reports, Settings
 */
export const PRIMARY_NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboard',
    path: '/',
    icon: '🏠',
    label: 'Dashboard',
    description: 'Overview of care status and urgent items',
    order: 1,
    isPrimary: true
  },
  {
    id: 'today',
    path: '/today',
    icon: '📋',
    label: 'Today',
    description: 'Unified care queue for today\'s tasks and alerts',
    order: 2,
    isPrimary: true
  },
  {
    id: 'call',
    path: '/call',
    icon: '📞',
    label: 'Call',
    description: 'Voice interface and call management',
    order: 3,
    isPrimary: true
  },
  {
    id: 'medications',
    path: '/medications',
    icon: '💊',
    label: 'Medications',
    description: 'Medication tracking and reminders',
    order: 4,
    isPrimary: true
  },
  {
    id: 'family',
    path: '/family',
    icon: '👨‍👩‍👧‍👦',
    label: 'Family',
    description: 'Family circle and care team management',
    order: 5,
    isPrimary: true
  },
  {
    id: 'timeline',
    path: '/timeline',
    icon: '📅',
    label: 'Timeline',
    description: 'Historical care events and outcomes',
    order: 6,
    isPrimary: true
  },
  {
    id: 'analytics',
    path: '/analytics',
    icon: '📈',
    label: 'Analytics',
    description: 'Care quality metrics and trends',
    order: 7,
    isPrimary: true
  },
  {
    id: 'reports',
    path: '/reports',
    icon: '📄',
    label: 'Reports',
    description: 'Exportable summaries for medical professionals',
    order: 8,
    isPrimary: true
  },
  {
    id: 'settings',
    path: '/settings',
    icon: '⚙️',
    label: 'Settings',
    description: 'Account and application preferences',
    order: 9,
    isPrimary: true
  }
];

/**
 * Secondary Navigation Items (less frequently used)
 */
export const SECONDARY_NAVIGATION: NavigationItem[] = [
  {
    id: 'emergency',
    path: '/emergency',
    icon: '🆘',
    label: 'Emergency',
    description: 'Emergency contacts and protocols',
    order: 10,
    isPrimary: false
  },
  {
    id: 'about',
    path: '/about',
    icon: 'ℹ️',
    label: 'About',
    description: 'App guide and help',
    order: 11,
    isPrimary: false
  }
];

/**
 * Legacy path mappings for backward compatibility
 * Maps old paths to new standardized paths
 */
export const LEGACY_PATH_MAPPINGS: Record<string, string> = {
  '/tasks': '/today',           // Tasks → Today (unified queue)
  '/actions': '/today',         // Care Actions → Today (unified queue)  
  '/alerts': '/today',          // Alerts → Today (unified queue)
  '/history': '/timeline',      // Care History → Timeline
  '/profile': '/settings'       // Profile → Settings
};

/**
 * Terminology mappings (Requirements 8.1)
 * Ensures consistent terminology throughout the application
 */
export const TERMINOLOGY_MAPPINGS: Record<string, string> = {
  'Care Actions': 'Tasks',
  'Care History': 'Timeline',
  'Profile': 'Settings',
  'Alerts': 'Today'
};

// =============================================
// Navigation Service Class
// =============================================

export class NavigationService {
  private static instance: NavigationService;
  private currentState: NavigationState;
  private listeners: ((state: NavigationState) => void)[] = [];

  private constructor() {
    this.currentState = {
      currentPath: '/',
      breadcrumbs: [],
      activeSection: 'dashboard'
    };
  }

  static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  /**
   * Get all primary navigation items
   */
  getPrimaryNavigation(): NavigationItem[] {
    return PRIMARY_NAVIGATION.map(item => ({
      ...item,
      isActive: this.isPathActive(item.path)
    }));
  }

  /**
   * Get all secondary navigation items
   */
  getSecondaryNavigation(): NavigationItem[] {
    return SECONDARY_NAVIGATION.map(item => ({
      ...item,
      isActive: this.isPathActive(item.path)
    }));
  }

  /**
   * Get all navigation items combined
   */
  getAllNavigation(): NavigationItem[] {
    return [...this.getPrimaryNavigation(), ...this.getSecondaryNavigation()]
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Navigate to a path with automatic legacy path mapping
   */
  navigateTo(path: string): string {
    // Apply legacy path mapping if needed
    const standardizedPath = LEGACY_PATH_MAPPINGS[path] || path;
    
    this.updateCurrentPath(standardizedPath);
    return standardizedPath;
  }

  /**
   * Update current path and notify listeners
   */
  updateCurrentPath(path: string): void {
    const previousPath = this.currentState.currentPath;
    this.currentState.currentPath = path;
    this.currentState.activeSection = this.getActiveSectionFromPath(path);
    
    // Update breadcrumbs
    this.currentState.breadcrumbs = this.generateBreadcrumbs(path);
    
    // Notify listeners of state change
    this.notifyListeners();
  }

  /**
   * Get current navigation state
   */
  getCurrentState(): NavigationState {
    return { ...this.currentState };
  }

  /**
   * Check if a path is currently active
   */
  isPathActive(path: string): boolean {
    return this.currentState.currentPath === path;
  }

  /**
   * Get standardized label for a path
   */
  getStandardizedLabel(originalLabel: string): string {
    return TERMINOLOGY_MAPPINGS[originalLabel] || originalLabel;
  }

  /**
   * Generate breadcrumbs for multi-step workflows (Requirements 8.7)
   */
  generateBreadcrumbs(path: string): BreadcrumbItem[] {
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always start with Dashboard
    if (path !== '/') {
      breadcrumbs.push({
        label: 'Dashboard',
        path: '/'
      });
    }

    // Handle specific workflow paths
    if (path.startsWith('/triage/')) {
      breadcrumbs.push({
        label: 'Today',
        path: '/today'
      });
      breadcrumbs.push({
        label: 'Urgent Triage Protocol',
        isActive: true
      });
    } else if (path.startsWith('/task/')) {
      breadcrumbs.push({
        label: 'Today',
        path: '/today'
      });
      breadcrumbs.push({
        label: 'Task Details',
        isActive: true
      });
    } else if (path.startsWith('/timeline/')) {
      breadcrumbs.push({
        label: 'Timeline',
        path: '/timeline'
      });
      if (path.includes('/event/')) {
        breadcrumbs.push({
          label: 'Event Details',
          isActive: true
        });
      }
    } else {
      // Standard single-page breadcrumb
      const navItem = this.findNavigationItemByPath(path);
      if (navItem && path !== '/') {
        breadcrumbs.push({
          label: navItem.label,
          isActive: true
        });
      }
    }

    return breadcrumbs;
  }

  /**
   * Subscribe to navigation state changes
   */
  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get navigation item by path
   */
  findNavigationItemByPath(path: string): NavigationItem | undefined {
    return this.getAllNavigation().find(item => item.path === path);
  }

  /**
   * Validate navigation structure for consistency
   */
  validateNavigationStructure(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allItems = this.getAllNavigation();
    
    // Check for duplicate paths
    const paths = allItems.map(item => item.path);
    const duplicatePaths = paths.filter((path, index) => paths.indexOf(path) !== index);
    if (duplicatePaths.length > 0) {
      errors.push(`Duplicate paths found: ${duplicatePaths.join(', ')}`);
    }

    // Check for duplicate IDs
    const ids = allItems.map(item => item.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check primary navigation order
    const primaryItems = allItems.filter(item => item.isPrimary);
    const expectedOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const actualOrder = primaryItems.map(item => item.order).sort((a, b) => a - b);
    if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
      errors.push('Primary navigation order is incorrect');
    }

    // Check required primary navigation items (Requirements 8.2)
    const requiredItems = ['dashboard', 'today', 'call', 'medications', 'family', 'timeline', 'analytics', 'reports', 'settings'];
    const missingItems = requiredItems.filter(id => !allItems.find(item => item.id === id));
    if (missingItems.length > 0) {
      errors.push(`Missing required navigation items: ${missingItems.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // =============================================
  // Private Helper Methods
  // =============================================

  private getActiveSectionFromPath(path: string): string {
    const navItem = this.findNavigationItemByPath(path);
    return navItem?.id || 'dashboard';
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState));
  }
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get navigation service instance
 */
export function getNavigationService(): NavigationService {
  return NavigationService.getInstance();
}

/**
 * Get standardized navigation items
 */
export function getStandardizedNavigation(): NavigationItem[] {
  return getNavigationService().getAllNavigation();
}

/**
 * Navigate to path with legacy mapping
 */
export function navigateToPath(path: string): string {
  return getNavigationService().navigateTo(path);
}

/**
 * Get current breadcrumbs
 */
export function getCurrentBreadcrumbs(): BreadcrumbItem[] {
  return getNavigationService().getCurrentState().breadcrumbs;
}

/**
 * Check if navigation structure is valid
 */
export function validateNavigation(): { valid: boolean; errors: string[] } {
  return getNavigationService().validateNavigationStructure();
}