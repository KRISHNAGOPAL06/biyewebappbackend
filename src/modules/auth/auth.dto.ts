import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const CompleteGoogleSelfSchema = z.object({
  role: z.literal('self'),
  creatingFor: z.string(),
  lookingFor: z.string().optional(),

  gender: z.string(),
  dob: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
});

export const CompleteGoogleParentSchema = z.object({
  role: z.literal('parent'),
  creatingFor: z.string(),
  lookingFor: z.string().optional(),

  candidate: z.object({
    email: z.string().email(),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    gender: z.string(),
    dob: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    phoneNumber: z.string().optional(),
  }),
});


export const SelfRegistrationSchema = z.object({
  lookingFor: z.string(),
  creatingFor: z.string(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  gender: z.string(),
  dob: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  password: z.string().min(8),
});

export const ParentRegistrationSchema = z.object({
  lookingFor: z.string(),
  creatingFor: z.string(),
  candidateFirstName: z.string().min(2),
  candidateLastName: z.string().min(2),
  candidateGender: z.string(),
  candidateDob: z.string(),
  candidateCity: z.string(),
  candidateState: z.string(),
  candidateCountry: z.string(),
  candidateEmail: z.string().email(),
  candidatePhoneNumber: z.string().optional(),
  parentFirstName: z.string().min(2),
  parentLastName: z.string().min(2),
  parentEmail: z.string().email(),
  parentPhoneNumber: z.string().optional(),
  password: z.string().min(8),
});

export const CandidateStartSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z.string().optional(),
});

export const InviteChildSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  relationship: z.string().min(1, 'Relationship is required'),
});

// export const VerifyOTPSchema = z.object({
//   // email: z.string().email('Invalid email address'),
//   email: z.string().optional(),

//   otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must contain only digits'),
// });

// export const LoginSchema = z.object({
//   // email: z.string().email('Invalid email address'),
//   email: z.string().optional(),
//   password: z.string().min(8, 'Password is required'),
// });

const DummyEmail = process.env.ALLOW_DUMMY_LOGIN === 'true'
  ? z.literal('biyeco-test')
  : z.never();

export const VerifyOTPSchema = z.object({
  email: z.union([
    z.string().email(),
    DummyEmail,
  ]),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const LoginSchema = z.object({
  email: z.union([
    z.string().email(),
    DummyEmail,
  ]),
  password: z.string().min(8),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const CandidateClaimSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const CandidateVerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must contain only digits'),
  password: z.string().min(8),
});

export const GoogleAuthSchema = z.object({
  idToken: z.string(),
  creatingFor: z.string().optional(), // self / parent
  lookingFor: z.string().optional(),
});

export type GoogleAuthDTO = z.infer<typeof GoogleAuthSchema>;

export type GoogleSelfOnboardingDTO = z.infer<
  typeof CompleteGoogleSelfSchema
>;

export type GoogleParentOnboardingDTO = z.infer<
  typeof CompleteGoogleParentSchema
>;


export const GoogleOnboardingSchema = z.discriminatedUnion('role', [
  CompleteGoogleSelfSchema,
  CompleteGoogleParentSchema,
]);

export type GoogleOnboardingDTO = z.infer<
  typeof GoogleOnboardingSchema
>;
export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type SelfRegistrationDTO = z.infer<typeof SelfRegistrationSchema>;
export type ParentRegistrationDTO = z.infer<typeof ParentRegistrationSchema>;
export type CandidateStartDTO = z.infer<typeof CandidateStartSchema>;
export type InviteChildDTO = z.infer<typeof InviteChildSchema>;
export type VerifyOTPDTO = z.infer<typeof VerifyOTPSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;
export type CandidateClaimDTO = z.infer<typeof CandidateClaimSchema>;
export type CandidateVerifyDTO = z.infer<typeof CandidateVerifySchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>;
