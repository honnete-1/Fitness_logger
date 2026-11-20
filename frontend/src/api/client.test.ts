import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, flattenErrors, request } from "./client";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("flattenErrors", () => {
  it("flattens nested DRF errors into dotted paths", () => {
    expect(
      flattenErrors({
        title: ["Required."],
        entries: [{}, { sets: [{}, { reps: ["Too small."] }], non_field_errors: ["Bad entry."] }],
      }),
    ).toEqual({
      title: ["Required."],
      "entries.1.sets.1.reps": ["Too small."],
      "entries.1.non_field_errors": ["Bad entry."],
    });
  });
});

describe("request", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "csrftoken=abc123";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("sends the CSRF token and JSON body on unsafe methods", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 1 }));
    await request("/api/workouts/", { method: "POST", body: { title: "x" } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["X-CSRFToken"]).toBe("abc123");
    expect(init.credentials).toBe("same-origin");
    expect(init.body).toBe('{"title":"x"}');
  });

  it("omits empty query parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    await request("/api/workouts/", { query: { search: "", page: 2, category: undefined } });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/workouts/?page=2");
  });

  it("raises ApiError with field errors on 400", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { title: ["Give your workout a title."] }));
    const err = (await request("/api/workouts/", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Give your workout a title.");
    expect(err.fieldErrors).toEqual({ title: ["Give your workout a title."] });
  });

  it("uses the server detail message when present", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { detail: "Incorrect username/email or password." }));
    const err = (await request("/api/auth/login/", { method: "POST", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe("Incorrect username/email or password.");
  });

  it("turns network failures into a friendly ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = (await request("/api/workouts/").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.isNetworkError).toBe(true);
    expect(err.message).toMatch(/couldn't reach the server/);
  });
});
