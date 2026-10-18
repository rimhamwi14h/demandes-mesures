export type Role =
  | "REQUESTER"
  | "TEAM_MANAGER"
  | "COMPANY_CONTACT"
  | "TECHNICIAN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  companyId: string | null;
}

export interface Team {
  id: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export type RequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NOT_MEASURABLE"
  | "CANCELLED";

export interface MeasurementRequest {
  id: string;
  measurementType: string;
  desiredDate: string;
  status: RequestStatus;
  createdAt: string;
  requesterId: string;
  requester: {
    id: string;
    name: string;
    email: string;
    teamId: string | null;
    companyId: string | null;
  };
  samples: {
    id: string;
    reference: string;
    description: string | null;
  }[];
}