import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import '@testing-library/jest-dom/extend-expect';
import PrivateRoute from './Private';

jest.mock('axios');

jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(),
}));

jest.mock('../Spinner', () => () => <div>Spinner</div>);

import { useAuth } from '../../context/auth';

// Zhu Shiqi, A0271719X
describe('PrivateRoute Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render Spinner and not call API when auth token is absent', () => {
        useAuth.mockReturnValue([{ token: null }, jest.fn()]);

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<div>Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Spinner')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('should render Spinner and not call API when auth token is an empty string', () => {
        useAuth.mockReturnValue([{ token: '' }, jest.fn()]);

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<div>Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Spinner')).toBeInTheDocument();
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('should render Outlet when token is valid and API returns true', async () => {
        useAuth.mockReturnValue([{ token: 'valid-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: { ok: true } });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<div>Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
        expect(screen.queryByText('Spinner')).not.toBeInTheDocument();
    });

    it('should call the correct API endpoint when a token is present', async () => {
        useAuth.mockReturnValue([{ token: 'some-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: { ok: true } });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<div>Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/user-auth');
        });
    });

    it('should render Spinner when token exists but API returns false', async () => {
        useAuth.mockReturnValue([{ token: 'invalid-token' }, jest.fn()]);
        axios.get.mockResolvedValueOnce({ data: { ok: false } });

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<div>Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
        expect(screen.getByText('Spinner')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render Spinner when token exists but API call throws an error', async () => {
        useAuth.mockReturnValue([{ token: 'some-token' }, jest.fn()]);
        axios.get.mockRejectedValueOnce(new Error('Network Error'));

        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<div>Protected Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
        expect(screen.getByText('Spinner')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
});
