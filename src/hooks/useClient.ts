const CLIENT_KEY = 'buddy_client_id';

export function getLoggedInClientId(): string | null {
  return localStorage.getItem(CLIENT_KEY);
}

export function loginClient(clientId: string): void {
  localStorage.setItem(CLIENT_KEY, clientId);
}

export function logoutClient(): void {
  localStorage.removeItem(CLIENT_KEY);
}
