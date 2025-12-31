export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
  profile: any;
}

export interface UserResponse {
  id: string;
  // email: string;
  // fullName: string | null;
  // phoneNumber: string | null;
  creatingFor: string,
  lookingFor: string,
  isVerified: boolean;
  createdAt: Date;
}

export interface SessionInfo {
  deviceId?: string;
  ip?: string;
  userAgent?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
}

export interface RefreshTokenData {
  userId: string;
  sessionId: string;
  tokenHash: string;
  createdAt: number;
}

export interface OTPData {
  otpHash: string;
  otpExpiry: Date;
}
