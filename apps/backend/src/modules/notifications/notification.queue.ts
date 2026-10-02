import { PushMessage } from '../firebase/firebase.service';

export const NOTIFICATIONS_QUEUE = 'notifications';

// Who a push goes to: specific users, or every driver (minus one, e.g. the
// rider who is also a driver account).
export type PushAudience =
  | { userIds: string[] }
  | { role: 'DRIVER'; exceptUserId?: string };

export type PushJob = { audience: PushAudience; message: PushMessage };
