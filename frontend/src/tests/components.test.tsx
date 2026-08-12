import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from '../components/ErrorState';
import { Navbar } from '../components/Navbar';
import { ErrorBoundary } from '../components/ErrorBoundary';

describe('Frontend Component Tests', () => {
  it('renders ErrorState component correctly when no path is found', () => {
    const handleOpenSearch = vi.fn();
    const handleRetry = vi.fn();

    render(
      <ErrorState
        type="not-found"
        message='No collaboration path found between "Artist A" and "Artist B".'
        onOpenSearch={handleOpenSearch}
        onRetry={handleRetry}
      />
    );

    expect(screen.getByText('No Collaboration Path Found')).toBeInTheDocument();
    
    const searchBtn = screen.getByRole('button', { name: /Try Other Artists/i });
    fireEvent.click(searchBtn);
    expect(handleOpenSearch).toHaveBeenCalledTimes(1);
  });

  it('renders Navbar header with active CognoDB connection badge', () => {
    const mockStatus = {
      tested: true,
      connected: true,
      uri: 'bolt+s://db-3bd9e34f.databases.cognodb.com',
    };

    render(
      <Navbar
        appMode="landing"
        dbStatus={mockStatus}
        onOpenCommandPalette={() => {}}
        onOpenHubs={() => {}}
        onOpenBridges={() => {}}
      />
    );

    expect(screen.getByText('Six Degrees')).toBeInTheDocument();
    expect(screen.getByText('Music Collaboration Network')).toBeInTheDocument();
  });

  it('ErrorBoundary renders fallback title and handles reset', () => {
    const ProblemChild = () => {
      throw new Error('Canvas Context Failure');
    };

    render(
      <ErrorBoundary fallbackTitle="Canvas Render Error">
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Canvas Render Error')).toBeInTheDocument();
    expect(screen.getByText('Canvas Context Failure')).toBeInTheDocument();
  });
});
