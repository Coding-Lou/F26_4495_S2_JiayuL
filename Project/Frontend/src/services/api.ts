import keycloak from "../keycloak";

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetail;

  constructor(message: string, status = 0, problem?: ProblemDetail) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

async function getAccessToken(): Promise<string> {
  try {
    await keycloak.updateToken(30);
  } catch {
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  }

  if (!keycloak.token) throw new ApiError("You are not signed in.", 401);
  return keycloak.token;
}

export async function apiRequest<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("Unable to reach the service. Check that it is running and try again.");
  }

  if (!response.ok) {
    let problem: ProblemDetail | undefined;
    try {
      problem = (await response.json()) as ProblemDetail;
    } catch {
      // Some infrastructure errors do not return ProblemDetail JSON.
    }
    const defaults: Record<number, string> = {
      400: "Please check the information you entered.",
      401: "Your session has expired. Please sign in again.",
      403: "You do not have permission to perform this action.",
      404: "The requested item could not be found.",
      500: "The service encountered an unexpected error.",
    };
    throw new ApiError(problem?.detail ?? problem?.title ?? defaults[response.status] ?? "Request failed.", response.status, problem);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.problem?.errors?.length) {
    return error.problem.errors.map(({ field, message }) => `${field}: ${message}`).join(" · ");
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
