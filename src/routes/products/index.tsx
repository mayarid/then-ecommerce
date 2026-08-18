import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod";

import { type CatalogProduct, ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getCategories, getProducts } from "@/lib/catalog.functions";

const searchSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
});

// biome-ignore assist/source/useSortedKeys: TanStack Router requires validateSearch before loaderDeps.
export const Route = createFileRoute("/products/")({
  component: ProductsPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    category: search.category,
    search: search.search,
  }),
  // Filtering happens in SQL. The page used to fetch every product and filter
  // in the browser, which shipped the whole catalogue on every search.
  loader: ({ deps }) =>
    Promise.all([getCategories(), getProducts({ data: deps })]),
});

function ProductsPage() {
  const [categories, products] = Route.useLoaderData() as [
    Array<{ id: string; name: string; slug: string }>,
    CatalogProduct[],
  ];
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });
  const [value, setValue] = useState(search.search ?? "");

  const submitSearch = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await navigate({
        search: (current) => ({
          ...current,
          search: value.trim() || undefined,
        }),
      });
    },
    [navigate, value]
  );

  return (
    <main className="mx-auto max-w-7xl px-5 pt-14 pb-20 sm:px-8">
      <div className="flex flex-col justify-between gap-8 border-b pb-10 md:flex-row md:items-end">
        <div>
          <p className="text-muted-foreground text-sm">Shop</p>
          <h1 className="mt-3 font-heading font-medium text-5xl tracking-[-0.06em]">
            The collection
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Useful pieces with a little more thought in them.
          </p>
        </div>
        <search className="w-full max-w-sm">
          <form onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="product-search">
              Search products
            </label>
            <InputGroup>
              <InputGroupInput
                id="product-search"
                onChange={(event) => setValue(event.target.value)}
                placeholder="Search products"
                type="search"
                value={value}
              />
              <InputGroupAddon>
                <InputGroupButton aria-label="Search products" type="submit">
                  <Search data-icon="inline-start" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </search>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 py-7">
        <Link
          className="text-muted-foreground text-sm transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:underline [&.active]:underline-offset-4"
          search={{}}
          to="/products"
        >
          All products
        </Link>
        {categories.map((category) => (
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:underline [&.active]:underline-offset-4"
            key={category.id}
            search={{ category: category.slug }}
            to="/products"
          >
            {category.name}
          </Link>
        ))}
      </div>

      {products.length > 0 ? (
        <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No products found</EmptyTitle>
            <EmptyDescription>
              Try another search or clear the current filter.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link search={{}} to="/products" />}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </main>
  );
}
