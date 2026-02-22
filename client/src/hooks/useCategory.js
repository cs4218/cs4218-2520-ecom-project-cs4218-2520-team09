import { useState, useEffect } from "react";
import axios from "axios";

export default function useCategory() {
  const [categories, setCategories] = useState([]);

  //get cat
  const getCategories = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      //Liu, Yiwei, A0332922J
      setCategories(data?.category || []);
    } catch (error) {
      //Liu, Yiwei, A0332922J
      console.error(error);
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  return categories;
}