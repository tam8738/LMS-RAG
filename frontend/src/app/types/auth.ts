export type Role = "teacher" | "admin";
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string;
}
