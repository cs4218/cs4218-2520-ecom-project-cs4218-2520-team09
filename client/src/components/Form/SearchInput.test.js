import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import SearchInput from './SearchInput';

jest.mock('axios');

const mockSetValues = jest.fn();

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(),
}));

import { useSearch } from '../../context/search';

// Zhu Shiqi, A0271719X
describe('SearchInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SearchInput />} />
          <Route path="/search" element={<div>Search Results Page</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders the search input and button', () => {
    const { getByPlaceholderText, getByRole } = renderComponent();

    expect(getByPlaceholderText('Search')).toBeInTheDocument();
    expect(getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('renders a form', () => {
    const { getByRole } = renderComponent();

    expect(getByRole('search')).toBeInTheDocument();
  });

  it('displays the current keyword value from context', () => {
    useSearch.mockReturnValue([{ keyword: 'shoes', results: [] }, mockSetValues]);

    const { getByPlaceholderText } = renderComponent();

    expect(getByPlaceholderText('Search').value).toBe('shoes');
  });

  it('input is empty when keyword is empty string', () => {
    const { getByPlaceholderText } = renderComponent();

    expect(getByPlaceholderText('Search').value).toBe('');
  });

  it('calls setValues with updated keyword when user types', () => {
    const { getByPlaceholderText } = renderComponent();

    fireEvent.change(getByPlaceholderText('Search'), {
      target: { value: 'laptop' },
    });

    expect(mockSetValues).toHaveBeenCalledWith({ keyword: 'laptop', results: [] });
  });

  it('calls the search API with the current keyword on form submit', async () => {
    useSearch.mockReturnValue([{ keyword: 'laptop', results: [] }, mockSetValues]);
    axios.get.mockResolvedValueOnce({ data: [] });

    const { getByRole } = renderComponent();

    fireEvent.submit(getByRole('search'));

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/laptop')
    );
  });

  it('updates results and navigates to /search on successful API response', async () => {
    const mockResults = [{ _id: '1', name: 'Blue Shirt' }];
    useSearch.mockReturnValue([{ keyword: 'shirt', results: [] }, mockSetValues]);
    axios.get.mockResolvedValueOnce({ data: mockResults });

    const { getByRole, getByText } = renderComponent();

    fireEvent.submit(getByRole('search'));

    await waitFor(() =>
      expect(mockSetValues).toHaveBeenCalledWith({ keyword: 'shirt', results: mockResults })
    );
    await waitFor(() =>
      expect(getByText('Search Results Page')).toBeInTheDocument()
    );
  });

  it('logs error and does not navigate on API failure', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const mockError = new Error('Network Error');
    useSearch.mockReturnValue([{ keyword: 'shirt', results: [] }, mockSetValues]);
    axios.get.mockRejectedValueOnce(mockError);

    const { getByRole, queryByText } = renderComponent();

    fireEvent.submit(getByRole('search'));

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith(mockError)
    );
    expect(queryByText('Search Results Page')).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
