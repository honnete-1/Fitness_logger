import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, authApi } from "../api";
import Login from "../pages/auth/Login";
import Register, { validateRegistration } from "../pages/auth/Register";
import { user } from "../test/fixtures";
import { renderPage } from "../test/render";

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return {
    ...actual,
    authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn(), updateMe: vi.fn(), updateGoal: vi.fn() },
  };
});

beforeEach(() => {
  vi.mocked(authApi.me).mockRejectedValue(new ApiError(401, "Please sign in"));
});

describe("Login", () => {
  it("renders an accessible form", () => {
    renderPage(<Login />);
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username or email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/register");
  });

  it("shows required-field errors without calling the API", async () => {
    renderPage(<Login />);
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByText("Enter your username or email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    renderPage(<Login />);
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });

  it("displays the API error on failed login", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(400, "Incorrect username/email or password."));
    renderPage(<Login />);
    await userEvent.type(screen.getByLabelText("Username or email"), "sam");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username/email or password.");
  });

  it("logs in and navigates away on success", async () => {
    vi.mocked(authApi.login).mockResolvedValue(user);
    renderPage(<Login />, { route: "/login", path: "/login" });
    await userEvent.type(screen.getByLabelText("Username or email"), "  sam ");
    await userEvent.type(screen.getByLabelText("Password"), "Secret-pass-1");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith("sam", "Secret-pass-1"));
    expect(await screen.findByText("Navigated away")).toBeInTheDocument();
  });
});

describe("Register", () => {
  it("validates on the client", () => {
    const errors = validateRegistration({ username: "bad name!", email: "nope", password: "short", password_confirm: "other" });
    expect(errors.username).toMatch(/letters, numbers/);
    expect(errors.email).toMatch(/valid email/);
    expect(errors.password).toMatch(/8 characters/);
    expect(errors.password_confirm).toMatch(/do not match/);
  });

  it("shows required-field errors", async () => {
    renderPage(<Register />);
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Choose a username.")).toBeInTheDocument();
    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Create a password.")).toBeInTheDocument();
    expect(screen.getByText("Confirm your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows server-side field errors such as duplicates", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError(400, "Taken", { email: ["An account with this email already exists."] }),
    );
    renderPage(<Register />);
    await userEvent.type(screen.getByLabelText("Username"), "jamie");
    await userEvent.type(screen.getByLabelText("Email address"), "jamie@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Sunrise-run-42");
    await userEvent.type(screen.getByLabelText("Confirm password"), "Sunrise-run-42");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
  });
});
