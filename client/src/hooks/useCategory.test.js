import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

jest.mock("axios");

//Liu, Yiwei, A0332922J
describe("useCategory Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty array on initial render", () => {
    axios.get.mockResolvedValue({ data: { category: [] } });
    const { result } = renderHook(() => useCategory());
    expect(result.current).toEqual([]);
  });

  it("given successful api response, then should update categories state with fetched data", async () => {
    const mockData = [{ _id: "1", name: "Electronics" }];
    axios.get.mockResolvedValue({ data: { category: mockData } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual(mockData);
    });
  });

  it("given api error, then should catch the error and maintain default empty array", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.current).toEqual([]);
    });
    consoleSpy.mockRestore();
  });

  it("given api success with null category field, then should default to empty array", async () => {
    axios.get.mockResolvedValue({ data: { category: null } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});