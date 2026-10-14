import { getAuthenticatedUser } from '../larkAuth';
import { effectiveUser } from './accessPolicy';
import type { NextRequest } from 'next/server';
export const requestActor = (req: NextRequest) => effectiveUser(getAuthenticatedUser(req));
