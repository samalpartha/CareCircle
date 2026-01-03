/**
 * Time Formatting Utilities
 * Provides caregiver-friendly time displays with:
 * - No negative times (handles timezone issues gracefully)
 * - Relative + absolute time on hover
 * - Consistent formatting across the app
 */

import { formatDistanceToNow, format, isValid } from 'date-fns';

/**
 * Format a timestamp in a caregiver-friendly way
 * @param {string|Date} timestamp - The timestamp to format
 * @param {Object} options - Formatting options
 * @returns {Object} { relative, absolute, tooltip }
 */
export function formatCareTime(timestamp, options = {}) {
  if (!timestamp) {
    return {
      relative: 'Just now',
      absolute: '',
      tooltip: 'No timestamp available',
      isStale: false,
    };
  }

  try {
    const date = new Date(timestamp);
    
    if (!isValid(date)) {
      return {
        relative: 'Unknown',
        absolute: '',
        tooltip: 'Invalid date',
        isStale: false,
      };
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Handle future dates (timezone issues) - treat as "Just now"
    if (diffMs < 0) {
      return {
        relative: 'Just now',
        absolute: format(date, 'MMM d, yyyy, h:mm a'),
        tooltip: `${format(date, 'MMM d, yyyy, h:mm a')}`,
        isStale: false,
      };
    }

    // Format relative time
    let relative;
    if (diffMinutes < 1) {
      relative = 'Just now';
    } else if (diffMinutes < 60) {
      relative = `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      relative = `${diffHours}h ago`;
    } else if (diffDays < 7) {
      relative = `${diffDays}d ago`;
    } else {
      relative = format(date, 'MMM d');
    }

    // Format absolute time (without seconds for cleaner display)
    const absolute = format(date, 'MMM d, yyyy, h:mm a');

    // Create tooltip with both
    const tooltip = `${relative} (${absolute})`;

    // Check if data is stale (more than 48 hours)
    const isStale = diffHours > 48;

    return {
      relative,
      absolute,
      tooltip,
      isStale,
    };
  } catch (error) {
    console.error('Error formatting time:', error);
    return {
      relative: 'Unknown',
      absolute: '',
      tooltip: 'Error parsing date',
      isStale: false,
    };
  }
}

/**
 * Format "Last updated" time without seconds
 * @param {Date} date - The date to format
 * @returns {string} Formatted string like "Dec 27, 2025, 8:53 PM"
 */
export function formatLastUpdated(date) {
  if (!date || !isValid(date)) {
    return 'Unknown';
  }
  return format(date, 'MMM d, yyyy, h:mm a');
}

/**
 * Check if any data source is stale
 * @param {Date} lastUpdated - Last update timestamp
 * @param {number} thresholdHours - Hours before considered stale (default 48)
 * @returns {boolean}
 */
export function isDataStale(lastUpdated, thresholdHours = 48) {
  if (!lastUpdated) return true;
  const now = new Date();
  const diffHours = (now - lastUpdated) / (1000 * 60 * 60);
  return diffHours > thresholdHours;
}

export default {
  formatCareTime,
  formatLastUpdated,
  isDataStale,
};




