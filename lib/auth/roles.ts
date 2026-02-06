export const USER_ROLES = ["master", "admin", "maestro", "tutor"] as const;
export type UserRole = (typeof USER_ROLES)[number];
