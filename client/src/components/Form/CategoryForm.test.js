// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CategoryForm from "./CategoryForm"; 

describe("CategoryForm Coverage Test", () => {
  
  // Liu, Yiwei, A0332922J
  test("should render input with provided value", () => {
    const mockSetValue = jest.fn();
    const mockSubmit = jest.fn();

    render(
      <CategoryForm
        value="Initial Value"
        setValue={mockSetValue}
        handleSubmit={mockSubmit}
      />
    );

    
    const input = screen.getByPlaceholderText("Enter new category");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Initial Value");
    
    
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  
  // Liu, Yiwei, A0332922J
  test("should call setValue when input changes", () => {
    const mockSetValue = jest.fn();
    const mockSubmit = jest.fn();

    render(
      <CategoryForm
        value=""
        setValue={mockSetValue}
        handleSubmit={mockSubmit}
      />
    );

    const input = screen.getByPlaceholderText("Enter new category");
    
    
    fireEvent.change(input, { target: { value: "New Data" } });

    
    expect(mockSetValue).toHaveBeenCalledTimes(1);
    expect(mockSetValue).toHaveBeenCalledWith("New Data");
  });

  
  // Liu, Yiwei, A0332922J
  test("should call handleSubmit when form is submitted", () => {
    const mockSetValue = jest.fn();
    
    const mockSubmit = jest.fn((e) => e.preventDefault());

    render(
      <CategoryForm
        value="Test"
        setValue={mockSetValue}
        handleSubmit={mockSubmit}
      />
    );

    const button = screen.getByRole("button", { name: /submit/i });
    
    
    fireEvent.click(button);

    
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});