import { Injectable } from '@nestjs/common';
import { FirebaseAdmin, InjectFirebaseAdmin } from 'nestjs-firebase';

// FCM error codes meaning "this token will never work", as opposed to
// transient failures (quota, unavailable) that should surface as errors.
const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-argument',
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

// FCM accepts at most 500 tokens per multicast request.
const MULTICAST_LIMIT = 500;

export type PushMessage = {
  title: string;
  body: string;
  // FCM data values must be strings.
  data?: Record<string, string>;
};

@Injectable()
export class FirebaseService {
  constructor(
    @InjectFirebaseAdmin() private readonly firebase: FirebaseAdmin,
  ) {}

  /**
   * Checks an FCM registration token with a dry-run send: Firebase validates
   * it against the project without delivering anything to the device.
   */
  async isValidFcmToken(token: string): Promise<boolean> {
    try {
      await this.firebase.messaging.send({ token }, true);
      return true;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code && INVALID_TOKEN_CODES.has(code)) return false;
      throw error;
    }
  }

  /**
   * Sends a notification to each token. Returns how many were delivered and
   * which tokens are permanently invalid, so callers can stop using them.
   */
  async sendPush(
    tokens: string[],
    { title, body, data = {} }: PushMessage,
  ): Promise<{ sent: number; invalidTokens: string[] }> {
    let sent = 0;
    const invalidTokens: string[] = [];
    for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
      const batch = tokens.slice(i, i + MULTICAST_LIMIT);
      const result = await this.firebase.messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data,
      });
      sent += result.successCount;
      result.responses.forEach((response, index) => {
        if (response.error && INVALID_TOKEN_CODES.has(response.error.code)) {
          invalidTokens.push(batch[index]);
        }
      });
    }
    return { sent, invalidTokens };
  }
}
