export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "reviewer_admin";
}

export function isReviewerRole(role: string | null | undefined): boolean {
  return role === "reviewer" || role === "reviewer_admin";
}
