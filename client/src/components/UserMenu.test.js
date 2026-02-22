import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import UserMenu from './UserMenu';

// Zhu Shiqi, A0271719X
describe('UserMenu Component', () => {
    const renderUserMenu = (initialEntry = '/') =>
        render(
            <MemoryRouter initialEntries={[initialEntry]}>
                <UserMenu />
            </MemoryRouter>
        );

    it('should render the Dashboard heading', () => {
        renderUserMenu();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render the Profile link', () => {
        renderUserMenu();
        expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should render the Orders link', () => {
        renderUserMenu();
        expect(screen.getByText('Orders')).toBeInTheDocument();
    });

    it('should have correct href for Profile link', () => {
        renderUserMenu();
        const profileLink = screen.getByText('Profile');
        expect(profileLink).toHaveAttribute('href', '/dashboard/user/profile');
    });

    it('should have correct href for Orders link', () => {
        renderUserMenu();
        const ordersLink = screen.getByText('Orders');
        expect(ordersLink).toHaveAttribute('href', '/dashboard/user/orders');
    });
});
