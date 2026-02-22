//Tan Wei Zhi, A0253519B
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMenu from "./AdminMenu";

const renderAdminMenu = () =>
    render(
        <MemoryRouter>
            <AdminMenu />
        </MemoryRouter>
    );

describe("AdminMenu Component", () => {
    describe("Rendering", () => {
        it("renders without crashing", () => {
            renderAdminMenu();
            expect(screen.getByText("Admin Panel")).toBeInTheDocument();
        });

        it("renders the Admin Panel heading", () => {
            renderAdminMenu();
            const heading = screen.getByRole("heading", { name: /admin panel/i });
            expect(heading).toBeInTheDocument();
        });

        it("renders all navigation links", () => {
            renderAdminMenu();
            expect(screen.getByText(/create category/i)).toBeInTheDocument();
            expect(screen.getByText(/create product/i)).toBeInTheDocument();
            expect(screen.getByText(/products/i)).toBeInTheDocument();
            expect(screen.getByText(/orders/i)).toBeInTheDocument();
        });

        it("does NOT render the commented-out Users link", () => {
            renderAdminMenu();
            expect(screen.queryByText(/users/i)).not.toBeInTheDocument();
        });
    });

    describe("Navigation Links", () => {
        it("Create Category link points to the correct route", () => {
            renderAdminMenu();
            const link = screen.getByText(/create category/i);
            expect(link).toHaveAttribute("href", "/dashboard/admin/create-category");
        });

        it("Create Product link points to the correct route", () => {
            renderAdminMenu();
            const link = screen.getByText(/create product/i);
            expect(link).toHaveAttribute("href", "/dashboard/admin/create-product");
        });

        it("Products link points to the correct route", () => {
            renderAdminMenu();
            const link = screen.getByText(/^products$/i);
            expect(link).toHaveAttribute("href", "/dashboard/admin/products");
        });

        it("Orders link points to the correct route", () => {
            renderAdminMenu();
            const link = screen.getByText(/orders/i);
            expect(link).toHaveAttribute("href", "/dashboard/admin/orders");
        });
    });

    describe("CSS Classes", () => {
        it("applies correct classes to each NavLink", () => {
            renderAdminMenu();
            const links = screen.getAllByRole("link");
            links.forEach((link) => {
                expect(link).toHaveClass("list-group-item", "list-group-item-action");
            });
        });

        it("renders the dashboard-menu class on the list group", () => {
            const { container } = renderAdminMenu();
            expect(container.querySelector(".dashboard-menu")).toBeInTheDocument();
        });

        it("renders the text-center class on the wrapper div", () => {
            const { container } = renderAdminMenu();
            expect(container.querySelector(".text-center")).toBeInTheDocument();
        });
    });

    describe("Link Count", () => {
        it("renders exactly 4 navigation links", () => {
            renderAdminMenu();
            const links = screen.getAllByRole("link");
            expect(links).toHaveLength(4);
        });
    });

    describe("Active Link Behavior", () => {
        it("applies active class when on the Create Category route", () => {
            render(
                <MemoryRouter initialEntries={["/dashboard/admin/create-category"]}>
                    <AdminMenu />
                </MemoryRouter>
            );
            const link = screen.getByText(/create category/i);
            expect(link).toHaveClass("active");
        });

        it("applies active class when on the Orders route", () => {
            render(
                <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
                    <AdminMenu />
                </MemoryRouter>
            );
            const link = screen.getByText(/orders/i);
            expect(link).toHaveClass("active");
        });

        it("does not apply active class to non-current routes", () => {
            render(
                <MemoryRouter initialEntries={["/dashboard/admin/orders"]}>
                    <AdminMenu />
                </MemoryRouter>
            );
            const link = screen.getByText(/create product/i);
            expect(link).not.toHaveClass("active");
        });
    });
});