import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from '../components/PageHeader';

describe('PageHeader', () => {
  it('renders title and subtitle', () => {
    render(<PageHeader title="Homelab" subtitle="Default Dashboard" textColor="#fff" />);
    expect(screen.getByText('Homelab')).toBeInTheDocument();
    expect(screen.getByText('Default Dashboard')).toBeInTheDocument();
  });
});

