import { Redirect } from "wouter";

// Signup is disabled — this portal is invite-only.
// Recruiter accounts are created via the seed script.
export default function Signup() {
  return <Redirect to="/login" />;
}
