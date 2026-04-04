import { vi } from "vitest";
import React from "react";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    target?: string;
    rel?: string;
  }) =>
    React.createElement("a", { href, ...rest }, children),
}));
