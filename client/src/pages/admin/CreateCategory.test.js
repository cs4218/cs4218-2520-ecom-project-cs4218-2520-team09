// Liu, Yiwei, A0332922J
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "./CreateCategory";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("./../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout" title={title}>{children}</div>
));
jest.mock("./../../components/AdminMenu", () => () => <div data-testid="admin-menu">Menu</div>);

jest.mock("../../components/Form/CategoryForm", () => ({ handleSubmit, value, setValue }) => (
  <form data-testid="category-form" onSubmit={handleSubmit}>
    <input
      data-testid="form-input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
    <button type="submit">Submit</button>
  </form>
));

jest.mock("antd", () => ({
  Modal: ({ onCancel, visible, children }) => (
    visible ? (
      <div data-testid="modal">
        <button data-testid="modal-cancel-btn" onClick={onCancel}>Cancel Modal</button>
        {children}
      </div>
    ) : null
  ),
}));

describe("CreateCategory Final 100% Coverage", () => {
  const mockCategories = [
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Books" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockResolvedValue({ data: { success: true, category: mockCategories } });
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });
  // Liu, Yiwei, A0332922J
  test("Should handle Get All business failure (success: false)", async () => {
    axios.get.mockResolvedValue({ data: { success: false } }); 

    render(<CreateCategory />);
    
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    
    expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
  });
  // Liu, Yiwei, A0332922J
  test("Should handle Get All exception", async () => {
    axios.get.mockRejectedValue(new Error("Get Error"));
    render(<CreateCategory />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something wwent wrong in getting catgeory");
    });
  });
  // Liu, Yiwei, A0332922J
  test("Should successfully create a category", async () => {
    axios.post.mockResolvedValue({ data: { success: true } });
    render(<CreateCategory />);
    
    const input = screen.getByTestId("form-input");
    fireEvent.change(input, { target: { value: "New Cat" } });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("New Cat is created");
      expect(axios.get).toHaveBeenCalledTimes(2); 
    });
  });
  // Liu, Yiwei, A0332922J
  test("Should handle create failure (success: false)", async () => {
    axios.post.mockResolvedValue({ data: { success: false, message: "Err" } });
    render(<CreateCategory />);
    
    const input = screen.getByTestId("form-input");
    fireEvent.change(input, { target: { value: "Fail" } });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Err");
    });
  });
  // Liu, Yiwei, A0332922J
  test("Should handle create exception", async () => {
    axios.post.mockRejectedValue(new Error("Net Err"));
    render(<CreateCategory />);
    fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("somthing went wrong in input form");
    });
  });
  // Liu, Yiwei, A0332922J
  test("Update: Should handle success", async () => {
    render(<CreateCategory />);
    await waitFor(() => screen.getByText("Electronics"));

    fireEvent.click(screen.getAllByText("Edit")[0]);
    
    const inputs = screen.getAllByTestId("form-input");
    const modalInput = inputs[1]; 
    
    axios.put.mockResolvedValue({ data: { success: true } });
    fireEvent.change(modalInput, { target: { value: "Elec Updated" } });
    
    const submitBtns = screen.getAllByText("Submit");
    fireEvent.click(submitBtns[1]); 

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Elec Updated is updated");
      expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    });
  });

  test("Update: Should handle failure (success: false)", async () => {
    render(<CreateCategory />);
    await waitFor(() => screen.getByText("Electronics"));

    fireEvent.click(screen.getAllByText("Edit")[0]);
    
    axios.put.mockResolvedValue({ data: { success: false, message: "Update Fail" } });
    
    const submitBtns = screen.getAllByText("Submit");
    fireEvent.click(submitBtns[1]); 

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update Fail");
    });
  });
  // Liu, Yiwei, A0332922J
  test("Update: Should handle exception", async () => {
    render(<CreateCategory />);
    await waitFor(() => screen.getByText("Electronics"));

    fireEvent.click(screen.getAllByText("Edit")[0]);
    
    axios.put.mockRejectedValue(new Error("Update Err"));
    
    const submitBtns = screen.getAllByText("Submit");
    fireEvent.click(submitBtns[1]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
    });
  });
  // Liu, Yiwei, A0332922J
  test("Update: Should handle modal cancel", async () => {
    render(<CreateCategory />);
    await waitFor(() => screen.getByText("Electronics"));

    fireEvent.click(screen.getAllByText("Edit")[0]);
    expect(screen.getByTestId("modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("modal-cancel-btn"));
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });
  // Liu, Yiwei, A0332922J
  test("Delete: Should handle success", async () => {
    render(<CreateCategory />);
    await waitFor(() => screen.getByText("Electronics"));
    
    axios.delete.mockResolvedValue({ data: { success: true } });
    fireEvent.click(screen.getAllByText("Delete")[0]);
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("category is deleted");
    });
  });
  // Liu, Yiwei, A0332922J
  test("Delete: Should handle failure", async () => {
    render(<CreateCategory />);
    await waitFor(() => screen.getByText("Electronics"));
    
    axios.delete.mockResolvedValue({ data: { success: false, message: "Del Fail" } });
    fireEvent.click(screen.getAllByText("Delete")[0]);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Del Fail");
    });
  });
  // Liu, Yiwei, A0332922J
  test("Delete: Should handle exception", async () => {
    render(<CreateCategory />);
    await waitFor(() => screen.getByText("Electronics"));
    
    axios.delete.mockRejectedValue(new Error("Del Err"));
    fireEvent.click(screen.getAllByText("Delete")[0]);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
    });
  });
});