import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Search from './Search';

jest.mock('../context/search', () => ({
  useSearch: jest.fn(),
}));

jest.mock('../context/cart', () => ({
  useCart: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
}));

jest.mock('../components/Layout', () => ({ children, title }) => (
  <div>
    <title>{title}</title>
    {children}
  </div>
));

import { useSearch } from '../context/search';
import { useCart } from '../context/cart';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const mockNavigate = jest.fn();
const mockSetCart = jest.fn();
const mockSetValues = jest.fn();

// Zhu Shiqi, A0271719X
describe('Search Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    useCart.mockReturnValue([[], mockSetCart]);
  });

  it('renders the page heading "Search Results"', () => {
    useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

    render(<Search />);

    expect(screen.getByText('Search Results')).toBeInTheDocument();
  });

  it('passes "Search results" as the layout title', () => {
    useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

    const { container } = render(<Search />);

    expect(container.querySelector('title')).toHaveTextContent('Search results');
  });

  it('renders "No Products Found" when results is empty', () => {
    useSearch.mockReturnValue([{ keyword: 'shirt', results: [] }, mockSetValues]);

    render(<Search />);

    expect(screen.getByText('No Products Found')).toBeInTheDocument();
  });

  it('renders found count when results are present', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
    ];
    useSearch.mockReturnValue([{ keyword: 'shirt', results: mockResults }, mockSetValues]);

    render(<Search />);

    expect(screen.getByText('Found 1')).toBeInTheDocument();
  });

  it('renders the correct number of product cards', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
      { _id: '2', name: 'Red Pants', description: 'red pants', price: 49.99, slug: 'red-pants' },
    ];
    useSearch.mockReturnValue([{ keyword: 'shirt', results: mockResults }, mockSetValues]);

    render(<Search />);

    expect(screen.getAllByText('More Details')).toHaveLength(2);
  });

  it('renders each product name', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
      { _id: '2', name: 'Red Pants', description: 'red pants', price: 49.99, slug: 'red-pants' },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    render(<Search />);

    expect(screen.getByText('Blue Shirt')).toBeInTheDocument();
    expect(screen.getByText('Red Pants')).toBeInTheDocument();
  });

  it('renders each product price', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    render(<Search />);

    expect(screen.getByText('$ 29.99')).toBeInTheDocument();
  });

  it('renders description truncated to 30 characters', () => {
    const description = 'A very very very very very very long description';
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description, price: 29.99, slug: 'blue-shirt' },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    render(<Search />);

    expect(screen.getByText(`${description.substring(0, 30)}...`)).toBeInTheDocument();
  });

  it('renders product image with correct src and alt', () => {
    const mockResults = [
      { _id: '123', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    render(<Search />);

    const img = screen.getByAltText('Blue Shirt');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/api/v1/product/product-photo/123');
  });

  it('renders "More Details" and "ADD TO CART" buttons for each product', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
      { _id: '2', name: 'Red Pants', description: 'red pants', price: 49.99, slug: 'red-pants' },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    render(<Search />);

    expect(screen.getAllByText('More Details')).toHaveLength(2);
    expect(screen.getAllByText('ADD TO CART')).toHaveLength(2);
  });

  it('navigates to product page when "More Details" is clicked', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    render(<Search />);

    fireEvent.click(screen.getByText('More Details'));

    expect(mockNavigate).toHaveBeenCalledWith('/product/blue-shirt');
  });

  it('adds product to cart and localStorage when "ADD TO CART" is clicked', () => {
    const existingCart = [{ _id: '0', name: 'Existing Item', description: 'existing', price: 10, slug: 'existing' }];
    useCart.mockReturnValue([existingCart, mockSetCart]);
    const newProduct = { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' };
    useSearch.mockReturnValue([{ keyword: '', results: [newProduct] }, mockSetValues]);

    Storage.prototype.setItem = jest.fn();

    render(<Search />);

    fireEvent.click(screen.getByText('ADD TO CART'));

    expect(mockSetCart).toHaveBeenCalledWith([...existingCart, newProduct]);
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      'cart',
      JSON.stringify([...existingCart, newProduct])
    );
  });

  it('shows success toast when "ADD TO CART" is clicked', () => {
    const mockResults = [
      { _id: '1', name: 'Blue Shirt', description: 'A blue shirt', price: 29.99, slug: 'blue-shirt' },
    ];
    useSearch.mockReturnValue([{ keyword: '', results: mockResults }, mockSetValues]);

    render(<Search />);

    fireEvent.click(screen.getByText('ADD TO CART'));

    expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
  });
});
