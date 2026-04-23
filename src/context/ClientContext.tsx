import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Client, Practitioner } from '../types/database';
import { getClient, getPractitioners, updateClient, getPractitionerDisplayName } from '../lib/store';
import { getLoggedInClientId } from '../hooks/useClient';

interface ClientContextValue {
  client: Client | null;
  practitioners: Practitioner[];
  assignedPractitioner: Practitioner | null;
  loading: boolean;
  selectPractitioner: (practitionerId: string) => Promise<void>;
  refreshClient: () => Promise<void>;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function ClientContextProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const clientId = getLoggedInClientId();
    if (!clientId) {
      setLoading(false);
      return;
    }
    const [clientData, practitionerList] = await Promise.all([
      getClient(clientId),
      getPractitioners(),
    ]);
    setClient(clientData ?? null);
    setPractitioners(practitionerList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectPractitioner = useCallback(async (practitionerId: string) => {
    const clientId = getLoggedInClientId();
    if (!clientId) return;
    const updated = await updateClient(clientId, { practitioner_id: practitionerId });
    if (updated) setClient(updated);
  }, []);

  const refreshClient = useCallback(async () => {
    const clientId = getLoggedInClientId();
    if (!clientId) return;
    const fresh = await getClient(clientId);
    if (fresh) setClient(fresh);
  }, []);

  const assignedPractitioner = practitioners.find((p) => p.id === client?.practitioner_id) ?? null;

  return (
    <ClientContext.Provider value={{ client, practitioners, assignedPractitioner, loading, selectPractitioner, refreshClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClientContext() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClientContext must be used within ClientContextProvider');
  return ctx;
}

export { getPractitionerDisplayName };
