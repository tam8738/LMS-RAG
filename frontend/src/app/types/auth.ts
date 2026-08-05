export type Role = "teacher" | "admin" | "student";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string;
  department?: string;
  phoneNumber?: string;
  gender?: Gender;
  dateOfBirth?: string;
  hireDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

