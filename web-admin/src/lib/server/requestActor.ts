import { getAuthenticatedUser, isSandboxLoginAllowed } from '../larkAuth';
import { USERS } from '../mockData';
import { effectiveUser } from './accessPolicy';
import type { NextRequest } from 'next/server';
import type { UserProfile } from '../types';

export const requestActor = async (req: NextRequest): Promise<UserProfile | null> => {
  const authUser = getAuthenticatedUser(req);
  if (authUser) return effectiveUser(authUser);
  if (process.env.NODE_ENV !== 'production' && isSandboxLoginAllowed()) {
    return effectiveUser(USERS[0]);
  }
  return null;
};
