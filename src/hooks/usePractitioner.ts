const PRACTITIONER_KEY = 'buddy_practitioner_id';

export function getLoggedInPractitionerId(): string | null {
  return sessionStorage.getItem(PRACTITIONER_KEY);
}

export function loginPractitioner(practitionerId: string): void {
  sessionStorage.setItem(PRACTITIONER_KEY, practitionerId);
}

export function logoutPractitioner(): void {
  sessionStorage.removeItem(PRACTITIONER_KEY);
}
