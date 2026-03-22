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
    email: `test${ts}${counter}@compliance.test`,
    password: "TestPass123!@#",
    username: `testuser${ts}${counter}`,
    firstName: "Test",
    lastName: "User",
  };
}
