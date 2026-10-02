import { Ride } from '../../generated/prisma/client';
import { RideStatus } from '../../generated/prisma/enums';
import { PushJob } from './notification.queue';

type Copy = { title: string; body: string };

// What each side of the ride hears about a status change. Missing entries
// mean "nothing to tell them" (e.g. the driver about their own accept).
const COPY: Partial<Record<RideStatus, { rider?: Copy; driver?: Copy }>> = {
  [RideStatus.ACCEPTED]: {
    rider: { title: 'Driver on the way', body: 'A driver accepted your ride.' },
  },
  [RideStatus.IN_PROGRESS]: {
    rider: { title: 'Trip started', body: 'Your trip is under way.' },
  },
  [RideStatus.COMPLETED]: {
    rider: {
      title: 'Trip completed',
      body: 'You have arrived. Thanks for riding!',
    },
    driver: {
      title: 'Trip completed',
      body: 'The trip has been marked as completed.',
    },
  },
  [RideStatus.CANCELLED]: {
    rider: { title: 'Ride cancelled', body: 'Your ride was cancelled.' },
    driver: { title: 'Ride cancelled', body: 'The rider cancelled this ride.' },
  },
};

function data(ride: Ride, type: string): Record<string, string> {
  return { type, rideId: ride.id, status: ride.status, link: '/dashboard' };
}

// A new request goes to every driver.
export function rideRequestedPush(ride: Ride): PushJob {
  const fare = ride.fare === null ? '' : ` · ${Number(ride.fare).toFixed(2)}`;
  return {
    audience: { role: 'DRIVER', exceptUserId: ride.riderId },
    message: {
      title: 'New ride request',
      body: `A rider is looking for a driver${fare}.`,
      data: data(ride, 'ride:requested'),
    },
  };
}

// A status change goes to the people on the ride, except whoever made it.
export function rideUpdatedPushes(ride: Ride, actorId: string): PushJob[] {
  const copy = COPY[ride.status];
  if (!copy) return [];
  const recipients: { userId: string | null; copy?: Copy }[] = [
    { userId: ride.riderId, copy: copy.rider },
    { userId: ride.driverId, copy: copy.driver },
  ];
  return recipients
    .filter(
      (r): r is { userId: string; copy: Copy } =>
        !!r.userId && !!r.copy && r.userId !== actorId,
    )
    .map(({ userId, copy: { title, body } }) => ({
      audience: { userIds: [userId] },
      message: { title, body, data: data(ride, 'ride:updated') },
    }));
}
