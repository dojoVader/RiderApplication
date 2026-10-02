import { Ride } from '../../generated/prisma/client';
import { RideStatus } from '../../generated/prisma/enums';
import { rideRequestedPush, rideUpdatedPushes } from './ride-notifications';

const ride = (status: RideStatus, driverId: string | null = 'driver-1'): Ride =>
  ({
    id: 'ride-1',
    riderId: 'rider-1',
    driverId,
    status,
    fare: '2500.00',
  }) as unknown as Ride;

const recipients = (status: RideStatus, actor: string) =>
  rideUpdatedPushes(ride(status), actor).map((job) => ({
    to: 'userIds' in job.audience ? job.audience.userIds : job.audience,
    title: job.message.title,
  }));

describe('ride notifications', () => {
  it('tells every driver except the requester about a new ride', () => {
    const job = rideRequestedPush(ride(RideStatus.REQUESTED, null));
    expect(job.audience).toEqual({ role: 'DRIVER', exceptUserId: 'rider-1' });
    expect(job.message.title).toBe('New ride request');
    expect(job.message.body).toContain('2500.00');
    expect(job.message.data).toEqual({
      type: 'ride:requested',
      rideId: 'ride-1',
      status: 'REQUESTED',
      link: '/dashboard',
    });
  });

  it('tells the rider when the driver accepts, starts and completes', () => {
    expect(recipients(RideStatus.ACCEPTED, 'driver-1')).toEqual([
      { to: ['rider-1'], title: 'Driver on the way' },
    ]);
    expect(recipients(RideStatus.IN_PROGRESS, 'driver-1')).toEqual([
      { to: ['rider-1'], title: 'Trip started' },
    ]);
    expect(recipients(RideStatus.COMPLETED, 'driver-1')).toEqual([
      { to: ['rider-1'], title: 'Trip completed' },
    ]);
  });

  it('tells the other side about a cancellation, never the person who cancelled', () => {
    expect(recipients(RideStatus.CANCELLED, 'rider-1')).toEqual([
      { to: ['driver-1'], title: 'Ride cancelled' },
    ]);
    expect(recipients(RideStatus.CANCELLED, 'driver-1')).toEqual([
      { to: ['rider-1'], title: 'Ride cancelled' },
    ]);
  });

  it('tells both sides when someone else (an admin) makes the change', () => {
    expect(
      recipients(RideStatus.CANCELLED, 'admin-1').map((r) => r.to),
    ).toEqual([['rider-1'], ['driver-1']]);
  });

  it('skips a missing driver and statuses with nothing to say', () => {
    expect(
      rideUpdatedPushes(ride(RideStatus.CANCELLED, null), 'rider-1'),
    ).toEqual([]);
    expect(rideUpdatedPushes(ride(RideStatus.REQUESTED), 'rider-1')).toEqual(
      [],
    );
  });

  it('only sends string data values, as FCM requires', () => {
    for (const job of rideUpdatedPushes(
      ride(RideStatus.CANCELLED),
      'admin-1',
    )) {
      expect(
        Object.values(job.message.data ?? {}).every(
          (v) => typeof v === 'string',
        ),
      ).toBe(true);
    }
  });
});
