import type {
  AuthUser,
  Invitation,
  Photo,
  Profile,
  Trip,
  TripInput,
  WrappedRecord,
  WrappedSnapshot,
} from "../types";

export interface InviteResult {
  delivery: "email" | "mailto";
  created: Invitation[];
  skipped: { email: string; reason: string }[];
  /** Present when delivery is "mailto": open this to send from the user's own mail app. */
  mailto?: string;
  note?: string;
}

export interface Store {
  mode: "supabase" | "local";

  // Auth
  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (user: AuthUser | null, event?: string) => void): () => void;
  signUp(email: string, password: string, fullName: string): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signInWithGoogle(next?: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;

  // Profile
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Pick<Profile, "full_name" | "home_city" | "avatar_url">>): Promise<Profile>;
  claimReferral(code: string): Promise<boolean>;

  // Trips
  listTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | null>;
  saveTrip(input: TripInput, id?: string): Promise<Trip>;
  deleteTrip(id: string): Promise<void>;
  uploadPhoto(tripId: string, file: Blob, caption?: string | null): Promise<Photo>;
  deletePhoto(photo: Photo): Promise<void>;

  // Wrapped
  listWrapped(): Promise<WrappedRecord[]>;
  saveWrapped(year: number, snapshot: WrappedSnapshot): Promise<WrappedRecord>;
  setWrappedPublic(id: string, isPublic: boolean): Promise<WrappedRecord>;

  // Invitations
  listInvitations(): Promise<Invitation[]>;
  sendInvitations(emails: string[], message: string): Promise<InviteResult>;
  deleteInvitation(id: string): Promise<void>;
}
