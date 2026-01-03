/**
 * Navigation Service
 * Standardizes navigation terminology and structure according to Requirements 8.1, 8.2, 8.3
 */

// =============================================
// Standardized Navigation Configuration
// =============================================

/**
 * Primary Navigation Items (Requirements 8.2)
 * Order: Dashboard, Today (Queue), Call, Medications, Family, Timeline, Analytics, Reports, Settings
 */
export const PRIMARY_NAVIGATION = [
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
    description: 'Voice/video call interface with AI monitoring',
    order: 3,
    isPrimary: true
  },
  {
    id: 'medications',
    path: '/medications',
    icon: '💊',
    label: 'Medications',
    description: 'Medication schedules and adherence tracking',
    order: 4,
    isPrimary: true
  },
  {
    id: 'family',
    path: '/family',
    icon: '👨‍👩‍👧‍👦',
    label: 'Family',
    description: 'Family member management and coordination',
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
    icon: '📊',
    label: 'Analytics',
    description: 'Care insights and trend analysis',
    order: 7,
    isPrimary: true
  },
  {
    id: 'reports',
    path: '/reports',
    icon: '📈',
    label: 'Reports',
    description: 'Care reports and documentation',
    order: 8,
    isPrimary: true
  },
  {
    id: 'settings',
    path: '/settings',
    icon: '⚙️',
    label: 'Settings',
    description: 'Account and application settings',
    order: 9,
    isPrimary: true
  }
];

/**
 * Secondary Navigation Items
 */
export const SECONDARY_NAVIGATION = [
  {
    id: 'about',
    path: '/about',
    icon: 'ℹ️',
    label: 'About',
    description: 'About CareCircle platform',
    order: 10,
    isPrimary: false
  }
];

/**
 * Legacy Route Mappings (Requirements 8.3)
 */
export const LEGACY_ROUTE_MAPPINGS = {
  '/actions': '/today',         // Care Actions → Today (unified queue)  
  '/alerts': '/today',          // Alerts → Today (unified queue)
  '/history': '/timeline',      // Care History → Timeline
  '/profile': '/settings'       // Profile → Settings
};

/**
 * Terminology Mappings (Requirements 8.1)
 */
export const TERMINOLOGY_MAPPINGS = {
  'Care Actions': 'Tasks',
  'Care History': 'Timeline',
  'Profile': 'Settings',
  'Alerts': 'Today'
};

// =============================================
// Navigation Service Class
// =============================================

class NavigationService {
  constructor() {
    this.currentPath = '/';
    this.subscribers = [];
    this.state = {
      currentPath: '/',
      breadcrumbs: [],
      activeSection: 'dashboard'
    };
  }

  /**
   * Subscribe to navigation state changes
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  /**
   * Notify all subscribers of state changes
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  /**
   * Update current path and recalculate state
   */
  updateCurrentPath(path) {
    this.currentPath = path;
    this.state.currentPath = path;
    this.state.activeSection = this.getActiveSectionFromPath(path);
    this.state.breadcrumbs = this.generateBreadcrumbs(path);
    this.notifySubscribers();
  }

  /**
   * Get current navigation state
   */
  getCurrentState() {
    return { ...this.state };
  }

  /**
   * Get primary navigation items with active state
   */
  getPrimaryNavigation() {
    return PRIMARY_NAVIGATION.map(item => ({
      ...item,
      isActive: this.currentPath === item.path
    }));
  }

  /**
   * Get secondary navigation items with active state
   */
  getSecondaryNavigation() {
    return SECONDARY_NAVIGATION.map(item => ({
      ...item,
      isActive: this.currentPath === item.path
    }));
  }

  /**
   * Get all navigation items
   */
  getAllNavigation() {
    return [
      ...this.getPrimaryNavigation(),
      ...this.getSecondaryNavigation()
    ];
  }

  /**
   * Navigate to a path (with legacy route mapping)
   */
  navigateTo(path) {
    const standardizedPath = LEGACY_ROUTE_MAPPINGS[path] || path;
    this.updateCurrentPath(standardizedPath);
    return standardizedPath;
  }

  /**
   * Get active section from path
   */
  getActiveSectionFromPath(path) {
    if (path === '/') return 'dashboard';
    
    const pathSegments = path.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];
    
    // Check if it's a primary navigation item
    const primaryItem = PRIMARY_NAVIGATION.find(item => 
      item.path === `/${firstSegment}` || item.id === firstSegment
    );
    
    return primaryItem ? primaryItem.id : 'dashboard';
  }

  /**
   * Generate breadcrumbs for current path
   */
  generateBreadcrumbs(path) {
    const breadcrumbs = [];
    
    // Always start with Dashboard
    breadcrumbs.push({
      label: 'Dashboard',
      path: '/',
      isActive: path === '/'
    });

    if (path !== '/') {
      const pathSegments = path.split('/').filter(Boolean);
      
      // Find the main section
      const mainSection = pathSegments[0];
      const navItem = PRIMARY_NAVIGATION.find(item => 
        item.path === `/${mainSection}` || item.id === mainSection
      );
      
      if (navItem) {
        breadcrumbs.push({
          label: navItem.label,
          path: navItem.path,
          isActive: path === navItem.path
        });
      }

      // Add sub-sections if they exist
      if (pathSegments.length > 1) {
        for (let i = 1; i < pathSegments.length; i++) {
          const segment = pathSegments[i];
          const subPath = '/' + pathSegments.slice(0, i + 1).join('/');
          
          breadcrumbs.push({
            label: this.formatSegmentLabel(segment),
            path: subPath,
            isActive: path === subPath
          });
        }
      }
    }

    return breadcrumbs;
  }

  /**
   * Format path segment into readable label
   */
  formatSegmentLabel(segment) {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// =============================================
// Service Instance and Exports
// =============================================

let navigationServiceInstance = null;

/**
 * Get singleton navigation service instance
 */
export function getNavigationService() {
  if (!navigationServiceInstance) {
    navigationServiceInstance = new NavigationService();
  }
  return navigationServiceInstance;
}

/**
 * Get current breadcrumbs
 */
export function getCurrentBreadcrumbs() {
  return getNavigationService().getCurrentState().breadcrumbs;
}

/**
 * Get standardized navigation items
 */
export function getStandardizedNavigation() {
  return getNavigationService().getAllNavigation();
}

/**
 * Validate navigation structure
 */
export function validateNavigation() {
  const errors = [];
  
  // Check required primary navigation items (Requirements 8.2)
  const requiredItems = ['dashboard', 'today', 'call', 'medications', 'family', 'timeline', 'analytics', 'reports', 'settings'];
  const allItems = [...PRIMARY_NAVIGATION, ...SECONDARY_NAVIGATION];
  
  const missingItems = requiredItems.filter(id => !allItems.find(item => item.id === id));
  if (missingItems.length > 0) {
    errors.push(`Missing required navigation items: ${missingItems.join(', ')}`);
  }

  // Check for duplicate IDs
  const ids = allItems.map(item => item.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate navigation IDs: ${duplicateIds.join(', ')}`);
  }

  // Check for duplicate paths
  const paths = allItems.map(item => item.path);
  const duplicatePaths = paths.filter((path, index) => paths.indexOf(path) !== index);
  if (duplicatePaths.length > 0) {
    errors.push(`Duplicate navigation paths: ${duplicatePaths.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  getNavigationService,
  getCurrentBreadcrumbs,
  getStandardizedNavigation,
  validateNavigation,
  PRIMARY_NAVIGATION,
  SECONDARY_NAVIGATION,
  LEGACY_ROUTE_MAPPINGS,
  TERMINOLOGY_MAPPINGS
};