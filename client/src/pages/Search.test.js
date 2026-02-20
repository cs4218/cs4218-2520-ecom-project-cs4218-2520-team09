import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Search from './Search';

jest.mock('../context/search', () => ({
  useSearch: jest.fn(),
}));

jest.mock('../components/Layout', () => ({ children, title }) => (
  <div>
    <title>{title}</title>
    {children}
  </div>
));

import { useSearch } from '../context/search';

const mockSetValues = jest.fn();

// Zhu Shiqi, A0271719X
describe('Search Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page heading "Search Results"', () => {
    useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

    const { getByText } = render(<Search />);

    expect(getByText('Search Results')).toBeInTheDocument();
  });

  it('passes "Search results" as the layout title', () => {
    useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

    const { container } = render(<Search />);

    expect(container.querySelector('title')).toHaveTextContent('Search results');
  });

  it('renders "No Products Found" when results is empty', () => {
    useSearch.mockReturnValue([{ keyword: 'shirt', results: [] }, mockSetValues]);

    const { getByText } = render(<Search />);

    expect(getByText('No Products Found')).toBeInTheDocument();
  });

  it('renders found count when results are present', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99 },
    ];
    useSearch.mockReturnValue([{ keyword: 'shirt', results: mockResults }, mockSetValues]);

    const { getByText } = render(<Search />);

    expect(getByText('Found 1')).toBeInTheDocument();
  });

  it('renders the correct number of product cards', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99 },
      { _id: '2', name: 'Red Pants', description: 'red pants', price: 49.99 },
    ];
    useSearch.mockReturnValue([{ keyword: 'shirt', results: mockResults }, mockSetValues]);

    const { getAllByText } = render(<Search />);

    expect(getAllByText('More Details')).toHaveLength(2);
  });

  it('renders each product name', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99 },
      { _id: '2', name: 'Red Pants', description: 'red pants', price: 49.99 },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    const { getByText } = render(<Search />);

    expect(getByText('Blue Shirt')).toBeInTheDocument();
    expect(getByText('Red Pants')).toBeInTheDocument();
  });

  it('renders each product price', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99 },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    const { getByText } = render(<Search />);

    expect(getByText('$ 29.99')).toBeInTheDocument();
  });

  it('renders description truncated to 30 characters', () => {
    const description = 'A very very very very very very long description';
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description, price: 29.99 },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    const { getByText } = render(<Search />);

    expect(getByText(`${description.substring(0, 30)}...`)).toBeInTheDocument();
  });

  it('renders product image with correct src and alt', () => {
    const mockResults = [
      { _id: '123', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99 },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    const { getByAltText } = render(<Search />);

    const img = getByAltText('Blue Shirt');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/v1/product/product-photo/123');
  });

  it('renders "More Details" and "ADD TO CART" buttons for each product', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99 },
      { _id: '2', name: 'Red Pants', description: 'red pants', price: 49.99 },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    const { getAllByText } = render(<Search />);

    expect(getAllByText('More Details')).toHaveLength(2);
    expect(getAllByText('ADD TO CART')).toHaveLength(2);
  });
});
