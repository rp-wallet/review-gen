import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { db } from '@/db';
import * as schema from '@/db/schema';

async function sendOtpEmail(email: string, otp: string, type: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[auth] ${type} OTP for ${email}: ${otp}`);
    }
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM || 'ReviewMockup <auth@reviewmockup.com>',
      to: email,
      subject: 'Your ReviewMockup sign-in code',
      text: `Your ReviewMockup code is ${otp}. It expires in 5 minutes.`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Unable to send OTP email: ${detail.slice(0, 200)}`);
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
