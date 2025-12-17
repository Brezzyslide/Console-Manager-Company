import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type CompanyStatus = 'active' | 'suspended' | 'onboarding';

export type Company = {
  id: string;
  legalName: string;
  abn?: string;
  ndisRegistrationNumber?: string;
  primaryContactName: string;
  primaryContactEmail: string;
  timezone: string;
  complianceScope: string[];
  status: CompanyStatus;
  createdAt: string;
};

export type ConsoleUser = {
  id: string;
  email: string;
  name: string;
};

// --- Mock Store ---

interface ConsoleStore {
  user: ConsoleUser | null;
  companies: Company[];
  
  // Actions
  login: (email: string) => void;
  logout: () => void;
  addCompany: (company: Omit<Company, 'id' | 'createdAt' | 'status'>) => Company;
  getCompany: (id: string) => Company | undefined;
}

export const useConsoleStore = create<ConsoleStore>()(
  persist(
    (set, get) => ({
      user: null,
      companies: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          legalName: 'Acme Care Services Pty Ltd',
          abn: '12 345 678 901',
          primaryContactName: 'Jane Doe',
          primaryContactEmail: 'jane@acmecare.com.au',
          timezone: 'Australia/Melbourne',
          complianceScope: ['Core', 'SIL'],
          status: 'active',
          createdAt: new Date('2024-01-15T09:00:00Z').toISOString(),
        },
        {
          id: '987fcdeb-51a2-43f1-a567-987654321000',
          legalName: 'Bright Horizons Support',
          primaryContactName: 'John Smith',
          primaryContactEmail: 'john.smith@brighthorizons.com',
          timezone: 'Australia/Sydney',
          complianceScope: ['Core'],
          status: 'onboarding',
          createdAt: new Date('2024-02-20T14:30:00Z').toISOString(),
        }
      ],
      
      login: (email: string) => {
        set({ 
          user: { 
            id: 'console-admin-1', 
            email, 
            name: 'Console Admin' 
          } 
        });
      },
      
      logout: () => set({ user: null }),
      
      addCompany: (newCompany) => {
        const company: Company = {
          ...newCompany,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          status: 'onboarding',
        };
        
        set((state) => ({
          companies: [company, ...state.companies]
        }));
        
        return company;
      },
      
      getCompany: (id: string) => {
        return get().companies.find(c => c.id === id);
      }
    }),
    {
      name: 'console-mock-storage',
    }
  )
);
