import React from 'react'
import Footer from './Footer';
import Header from './Header';
import { Helmet } from "react-helmet";
import  { Toaster } from 'react-hot-toast';


const toMetaString = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (React.isValidElement(value)) return fallback;
  return fallback;
};


const Layout = ({ children, title, description, keywords, author }) => {
  const safeTitle = toMetaString(title, "Ecommerce app - shop now");
  const safeDescription = toMetaString(description, "mern stack project");
  const safeKeywords = toMetaString(keywords, "mern,react,node,mongodb");
  const safeAuthor = toMetaString(author, "Techinfoyt");

  return (
    <div>
      <Helmet>
        <meta charSet="utf-8" />
        <meta name="description" content={safeDescription} />
        <meta name="keywords" content={safeKeywords} />
        <meta name="author" content={safeAuthor} />
        <title>{safeTitle}</title>
      </Helmet>
      <Header />
      <main style={{ minHeight: "70vh" }}>
        <Toaster />
        {children}
      </main>
      <Footer />
    </div>
  );
};

Layout.defaultProps = {
  title: "Ecommerce app - shop now",
  description: "mern stack project",
  keywords: "mern,react,node,mongodb",
  author: "Techinfoyt",
};

export default Layout;