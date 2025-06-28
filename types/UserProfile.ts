// types/UserProfile.ts
export interface UserProfile {
  id: string;
  created_at: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  birthdate: string | null;
  street: string | null;
  street_nr: string | null;
  zip: string | null;
  city: string | null;
  is_active: boolean;
  assigned_staff: string | null;
  category: string | null;
}