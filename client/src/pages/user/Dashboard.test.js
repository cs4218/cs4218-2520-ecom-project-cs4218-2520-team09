import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Dashboard from './Dashboard';

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../../components/Layout', () => ({ children, title }) => (
    <div>
        <title>{title}</title>
        {children}
    </div>
));

jest.mock('../../components/UserMenu', () => () => <div>UserMenu</div>);

import { useAuth } from '../../context/auth';

// Zhu Shiqi, A0271719X
describe('Dashboard Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render UserMenu', () => {
        useAuth.mockReturnValue([{ user: { name: 'John', email: 'john@example.com', address: '123 St' } }]);

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('UserMenu')).toBeInTheDocument();
    });

    it('should display the user name', () => {
        useAuth.mockReturnValue([{ user: { name: 'John', email: 'john@example.com', address: '123 St' } }]);

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should display the user email', () => {
        useAuth.mockReturnValue([{ user: { name: 'John', email: 'john@example.com', address: '123 St' } }]);

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display the user address', () => {
        useAuth.mockReturnValue([{ user: { name: 'John', email: 'john@example.com', address: '123 St' } }]);

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('123 St')).toBeInTheDocument();
    });

    it('should render with the correct page title', () => {
        useAuth.mockReturnValue([{ user: { name: 'John', email: 'john@example.com', address: '123 St' } }]);

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText('Dashboard - Ecommerce App')).toBeInTheDocument();
    });
});
