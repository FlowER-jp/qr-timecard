import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export type AdminPayload = { role: "admin"; adminId: number; username: string };
export type EmployeePayload = {
  role: "employee";
  employeeId: number;
  employeeCode: string;
  name: string;
};
export type JWTPayload = AdminPayload | EmployeePayload;

export async function signToken(payload: JWTPayload, expiresIn = "12h"): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session as AdminPayload;
}

export async function getEmployeeSession(): Promise<EmployeePayload | null> {
  const session = await getSession();
  if (!session || session.role !== "employee") return null;
  return session as EmployeePayload;
}
