import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { useSearch, SearchProvider } from './search';

// Zhu Shiqi, A0271719X
describe('search', () => {
  it('provides initial keyword as empty string', () => {
    let contextValue;
    const Child = () => {
      contextValue = useSearch();
      return null;
    };

    render(
      <SearchProvider>
        <Child />
      </SearchProvider>
    );

    expect(contextValue[0].keyword).toBe('');
  });

  it('provides initial results as empty array', () => {
    let contextValue;
    const Child = () => {
      contextValue = useSearch();
      return null;
    };

    render(
      <SearchProvider>
        <Child />
      </SearchProvider>
    );

    expect(contextValue[0].results).toEqual([]);
  });

  it('useSearch returns the context value inside SearchProvider', () => {
    let contextValue;
    const Child = () => {
      contextValue = useSearch();
      return null;
    };

    render(
      <SearchProvider>
        <Child />
      </SearchProvider>
    );

    expect(contextValue).toBeDefined();
    expect(Array.isArray(contextValue)).toBe(true);
    expect(contextValue).toHaveLength(2);
    expect(typeof contextValue[1]).toBe('function');
  });

  it('useSearch returns undefined when used outside SearchProvider', () => {
    let contextValue;
    const Child = () => {
      contextValue = useSearch();
      return null;
    };

    render(<Child />);

    expect(contextValue).toBeUndefined();
  });

  it('allows updating state via the setter function', () => {
    let contextValue;
    const Child = () => {
      contextValue = useSearch();
      return null;
    };

    render(
      <SearchProvider>
        <Child />
      </SearchProvider>
    );

    act(() => {
      contextValue[1]({ keyword: 'shoes', results: [{ _id: '1' }] });
    });

    expect(contextValue[0].keyword).toBe('shoes');
    expect(contextValue[0].results).toEqual([{ _id: '1' }]);
  });
});
