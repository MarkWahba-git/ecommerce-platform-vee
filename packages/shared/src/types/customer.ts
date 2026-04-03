export interface CustomerSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  phone: string | null;
  marketingConsent: boolean;
  consentDate: string | null;
  notes: string | null;
  addresses: CustomerAddress[];
}

export interface CustomerAddress {
  id: string;
  type: string;
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company: string | null;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
}
