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

export function generateTestUser(): TestUser {
  counter++;
  const ts = Date.now();
  return {
    // example.com is reserved by RFC 2606 and accepted everywhere. Do NOT use
    // a .test address here: it is a reserved special-use TLD, and strict
    // validators (Pydantic/email-validator in the FastAPI template) reject it,
    // which fails the suite for a reason that has nothing to do with the API.
    email: `test${ts}${counter}@example.com`,
    password: "TestPass123!@#",
    username: `testuser${ts}${counter}`,
    firstName: "Test",
    lastName: "User",
  };
}
