export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  isPlatformAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AuthUserInput {
  email: string;
  password: string;
  isPlatformAdmin?: boolean;
}

export interface AuthTokenClaims {
  sub: string;
  email: string;
  partition: string;
  isPlatformAdmin: boolean;
}

export interface RefreshTokenClaims {
  sub: string;
  partition: string;
  type: "refresh";
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface MeResponse {
  id: string;
  email: string;
  isPlatformAdmin: boolean;
  orgMemberships: Array<{
    orgId: string;
    orgName: string;
    role: string;
    active: boolean;
  }>;
}
