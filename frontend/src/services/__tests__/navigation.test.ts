/**
 * Navigation Service Property-Based Tests
 * Implements Property 12: Navigation Terminology Consistency
 * Validates Requirements 8.1, 8.2, 8.3
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import fc from 'fast-check';
import {
  NavigationService,
  getNavigationService,
  PRIMARY_NAVIGATION,
  SECONDARY_NAVIGATION,
  LEGACY_PATH_MAPPINGS,
  TERMINOLOGY_MAPPINGS,
  validateNavigation,
  NavigationItem,
  BreadcrumbItem
} from '../navigation';

describe('Navigation Service Property-Based Tests', () => {
  let navigationService: NavigationService;

  beforeEach(() => {
    navigationService = getNavigationService();
  });

  /**
   * Property 12: Navigation Terminology Consistency
   * For any navigation item, the terminology should be consistent across the application
   * **Validates: Requirements 8.1, 8.2, 8.3**
   */
  describe('Property 12: Navigation Terminology Consistency', () => {
    test('should maintain consistent terminology mappings for all legacy terms', () => {
      fc.assert(fc.property(
        fc.constantFrom(...Object.keys(TERMINOLOGY_MAPPINGS)),
        (legacyTerm) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const standardizedTerm = navigationService.getStandardizedLabel(legacyTerm);
          const expectedTerm = TERMINOLOGY_MAPPINGS[legacyTerm];
          
          expect(standardizedTerm).toBe(expectedTerm);
          expect(standardizedTerm).not.toBe(legacyTerm); // Should be different from legacy
        }
      ), { numRuns: 100 });
    });

    test('should map all legacy paths to standardized paths consistently', () => {
      fc.assert(fc.property(
        fc.constantFrom(...Object.keys(LEGACY_PATH_MAPPINGS)),
        (legacyPath) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const standardizedPath = navigationService.navigateTo(legacyPath);
          const expectedPath = LEGACY_PATH_MAPPINGS[legacyPath];
          
          expect(standardizedPath).toBe(expectedPath);
          expect(standardizedPath).not.toBe(legacyPath); // Should be different from legacy
          
          // Verify the standardized path exists in navigation
          const navItem = navigationService.findNavigationItemByPath(standardizedPath);
          expect(navItem).toBeDefined();
        }
      ), { numRuns: 100 });
    });

    test('should maintain required primary navigation structure', () => {
      fc.assert(fc.property(
        fc.constant(null), // No random input needed
        () => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const primaryNav = navigationService.getPrimaryNavigation();
          
          // Required items per Requirements 8.2
          const requiredItems = ['dashboard', 'today', 'call', 'medications', 'family', 'timeline', 'analytics', 'reports', 'settings'];
          
          requiredItems.forEach(requiredId => {
            const item = primaryNav.find(nav => nav.id === requiredId);
            expect(item).toBeDefined();
            expect(item?.isPrimary).toBe(true);
          });
          
          // Verify correct order (1-9 for primary items)
          const orders = primaryNav.map(item => item.order).sort((a, b) => a - b);
          expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        }
      ), { numRuns: 100 });
    });

    test('should generate valid breadcrumbs for all navigation paths', () => {
      fc.assert(fc.property(
        fc.constantFrom(...PRIMARY_NAVIGATION.map(item => item.path), ...SECONDARY_NAVIGATION.map(item => item.path)),
        (path) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const breadcrumbs = navigationService.generateBreadcrumbs(path);
          
          // All breadcrumbs should have labels
          breadcrumbs.forEach(crumb => {
            expect(crumb.label).toBeDefined();
            expect(crumb.label.length).toBeGreaterThan(0);
          });
          
          // Last breadcrumb should be active for non-root paths
          if (path !== '/' && breadcrumbs.length > 0) {
            const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
            expect(lastCrumb.isActive).toBe(true);
          }
          
          // Non-active breadcrumbs should have paths
          breadcrumbs.forEach(crumb => {
            if (!crumb.isActive) {
              expect(crumb.path).toBeDefined();
              expect(crumb.path).toMatch(/^\/.*$/); // Should start with /
            }
          });
        }
      ), { numRuns: 100 });
    });

    test('should validate navigation structure consistency', () => {
      fc.assert(fc.property(
        fc.constant(null), // No random input needed
        () => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const validation = validateNavigation();
          
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
          
          // Additional consistency checks
          const allItems = navigationService.getAllNavigation();
          
          // No duplicate paths
          const paths = allItems.map(item => item.path);
          const uniquePaths = new Set(paths);
          expect(uniquePaths.size).toBe(paths.length);
          
          // No duplicate IDs
          const ids = allItems.map(item => item.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
          
          // All items have required properties
          allItems.forEach(item => {
            expect(item.id).toBeDefined();
            expect(item.path).toBeDefined();
            expect(item.label).toBeDefined();
            expect(item.icon).toBeDefined();
            expect(item.description).toBeDefined();
            expect(typeof item.order).toBe('number');
            expect(typeof item.isPrimary).toBe('boolean');
          });
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * Navigation State Management Tests
   */
  describe('Navigation State Management', () => {
    test('should maintain consistent state across path updates', () => {
      fc.assert(fc.property(
        fc.array(fc.constantFrom(...PRIMARY_NAVIGATION.map(item => item.path)), { minLength: 1, maxLength: 10 }),
        (paths) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          let lastState = navigationService.getCurrentState();
          
          paths.forEach(path => {
            navigationService.updateCurrentPath(path);
            const currentState = navigationService.getCurrentState();
            
            expect(currentState.currentPath).toBe(path);
            expect(currentState.activeSection).toBeDefined();
            expect(Array.isArray(currentState.breadcrumbs)).toBe(true);
            
            lastState = currentState;
          });
        }
      ), { numRuns: 50 });
    });

    test('should handle legacy path navigation consistently', () => {
      fc.assert(fc.property(
        fc.constantFrom(...Object.keys(LEGACY_PATH_MAPPINGS)),
        (legacyPath) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const initialState = navigationService.getCurrentState();
          const standardizedPath = navigationService.navigateTo(legacyPath);
          const finalState = navigationService.getCurrentState();
          
          expect(finalState.currentPath).toBe(standardizedPath);
          expect(finalState.currentPath).toBe(LEGACY_PATH_MAPPINGS[legacyPath]);
          
          // Should find navigation item for standardized path
          const navItem = navigationService.findNavigationItemByPath(standardizedPath);
          expect(navItem).toBeDefined();
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * Breadcrumb Generation Tests
   */
  describe('Breadcrumb Generation', () => {
    test('should generate appropriate breadcrumbs for workflow paths', () => {
      fc.assert(fc.property(
        fc.constantFrom('/triage/fall-001', '/task/med-reminder-123', '/timeline/event/triage-456'),
        (workflowPath) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const breadcrumbs = navigationService.generateBreadcrumbs(workflowPath);
          
          expect(breadcrumbs.length).toBeGreaterThan(1); // Should have parent + current
          
          // First breadcrumb should be Dashboard (unless we're on dashboard)
          if (workflowPath !== '/') {
            expect(breadcrumbs[0].label).toBe('Dashboard');
            expect(breadcrumbs[0].path).toBe('/');
          }
          
          // Last breadcrumb should be active
          const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
          expect(lastCrumb.isActive).toBe(true);
          expect(lastCrumb.path).toBeUndefined(); // Active items don't have paths
        }
      ), { numRuns: 100 });
    });

    test('should maintain breadcrumb hierarchy consistency', () => {
      fc.assert(fc.property(
        fc.constantFrom(...PRIMARY_NAVIGATION.map(item => item.path)),
        (path) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const breadcrumbs = navigationService.generateBreadcrumbs(path);
          
          // Verify breadcrumb structure
          breadcrumbs.forEach((crumb, index) => {
            expect(crumb.label).toBeDefined();
            expect(crumb.label.length).toBeGreaterThan(0);
            
            // Only last item should be active
            if (index === breadcrumbs.length - 1) {
              expect(crumb.isActive).toBe(true);
            } else {
              expect(crumb.isActive).toBeFalsy();
              expect(crumb.path).toBeDefined();
            }
          });
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * Navigation Item Properties Tests
   */
  describe('Navigation Item Properties', () => {
    test('should maintain consistent navigation item properties', () => {
      fc.assert(fc.property(
        fc.constant(null), // No random input needed
        () => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const allItems = navigationService.getAllNavigation();
          
          allItems.forEach(item => {
            // Required properties
            expect(item.id).toMatch(/^[a-z][a-z-]*[a-z]$|^[a-z]$/); // kebab-case or single letter
            expect(item.path).toMatch(/^\/[a-z-]*$/); // Valid path format
            expect(item.label).toMatch(/^[A-Z][A-Za-z\s]*$/); // Proper case
            expect(item.icon).toMatch(/^.$/); // Single emoji/character
            expect(item.description.length).toBeGreaterThan(10); // Meaningful description
            expect(item.order).toBeGreaterThan(0);
            expect(typeof item.isPrimary).toBe('boolean');
            
            // Primary items should have orders 1-9
            if (item.isPrimary) {
              expect(item.order).toBeGreaterThanOrEqual(1);
              expect(item.order).toBeLessThanOrEqual(9);
            } else {
              expect(item.order).toBeGreaterThan(9);
            }
          });
        }
      ), { numRuns: 100 });
    });

    test('should maintain navigation item uniqueness', () => {
      fc.assert(fc.property(
        fc.constant(null), // No random input needed
        () => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const allItems = navigationService.getAllNavigation();
          
          // Unique IDs
          const ids = allItems.map(item => item.id);
          expect(new Set(ids).size).toBe(ids.length);
          
          // Unique paths
          const paths = allItems.map(item => item.path);
          expect(new Set(paths).size).toBe(paths.length);
          
          // Unique orders
          const orders = allItems.map(item => item.order);
          expect(new Set(orders).size).toBe(orders.length);
          
          // Unique labels
          const labels = allItems.map(item => item.label);
          expect(new Set(labels).size).toBe(labels.length);
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * Integration Tests
   */
  describe('Navigation Integration', () => {
    test('should handle navigation subscription and updates correctly', () => {
      fc.assert(fc.property(
        fc.array(fc.constantFrom(...PRIMARY_NAVIGATION.map(item => item.path)), { minLength: 2, maxLength: 5 }),
        (paths) => {
          // **Feature: care-operations-console, Property 12: Navigation Terminology Consistency**
          const stateUpdates: any[] = [];
          
          const unsubscribe = navigationService.subscribe((state) => {
            stateUpdates.push({ ...state });
          });
          
          paths.forEach(path => {
            navigationService.updateCurrentPath(path);
          });
          
          unsubscribe();
          
          // Should have received updates for each path change
          expect(stateUpdates.length).toBe(paths.length);
          
          // Last update should match last path
          const lastUpdate = stateUpdates[stateUpdates.length - 1];
          expect(lastUpdate.currentPath).toBe(paths[paths.length - 1]);
        }
      ), { numRuns: 50 });
    });
  });
});