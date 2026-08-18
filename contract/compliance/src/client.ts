import axios, { type AxiosInstance } from "axios";

const BASE_URL = process.env.API_URL || "http://localhost:8080";

export function createClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 10_000,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    validateStatus: () => true,
  });
}

export interface TestUser {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}

let counter = 0;

// Vitest runs each test file in its own module instance, so `counter` restarts
// at 1 per file and is not unique across the suite. Timestamp plus counter alone
// therefore collides whenever two files call this in the same millisecond, and
// the loser gets a 409 on a registration it expected to succeed. The random
// suffix is what actually makes these unique; base 36 keeps `username` inside
// its 30-character column.
function uniqueSuffix(): string {
  counter++;
  return `${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTestUser(): TestUser {
  const unique = uniqueSuffix();
  return {
    // example.com is reserved by RFC 2606 and accepted everywhere. Do NOT use
    // a .test address here: it is a reserved special-use TLD, and strict
    // validators (Pydantic/email-validator in the FastAPI template) reject it,
    // which fails the suite for a reason that has nothing to do with the API.
    email: `test${unique}@example.com`,
    password: "TestPass123!@#",
    username: `testuser${unique}`,
    firstName: "Test",
    lastName: "User",
  };
}
