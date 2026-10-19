import type { Role } from "./types";

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AdminTeam {
  id: string;
  name: string;
  managerId: string | null;
  members: AdminMember[];
}

export interface AdminCompany {
  id: string;
  name: string;
  contact: {
    id: string;
    name: string;
    email: string;
    role: Role;
    companyId: string;
  } | null;
}