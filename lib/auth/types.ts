import type { UserRole } from "./roles";

export interface ServerProfile {
  id: string;
  role: UserRole;
  email: string | null;
  full_name: string | null;
  institution_id: string | null;
}
