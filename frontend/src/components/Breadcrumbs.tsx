/**
 * Breadcrumbs Component
 * Implements Requirements 8.7 for breadcrumb navigation in multi-step workflows
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BreadcrumbItem } from '../services/navigation';
import './Breadcrumbs.css';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: string;
}

/**
 * Breadcrumbs Component for Multi-step Workflows
 * Provides navigation context for complex workflows like Urgent Triage Protocol
 */
function Breadcrumbs({ items, className = '', separator = '/' }: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav 
      className={`breadcrumbs ${className}`}
      aria-label="Breadcrumb navigation"
      role="navigation"
    >
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li 
            key={index} 
            className={`breadcrumb-item ${item.isActive ? 'active' : ''}`}
          >
            {item.path && !item.isActive ? (
              <Link 
                to={item.path} 
                className="breadcrumb-link"
                aria-current={item.isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className="breadcrumb-text"
                aria-current={item.isActive ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            
            {index < items.length - 1 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                {separator}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;