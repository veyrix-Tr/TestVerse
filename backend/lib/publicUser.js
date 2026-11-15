// lib/publicUser.js
// What the API sends back about a user. Load the user with `include: WITH_SUBSCRIPTION`
// so the student's batch purchase comes along.

const WITH_SUBSCRIPTION = { subscription: { include: { batch: true } } };

// A batch is bought for one year from the day it was activated; after that the
// subscription becomes "expired" (lib/upkeep.js) and can be bought again.
const BATCH_DAYS = 365;
const batchEndsAt = (activatedAt) => (activatedAt ? new Date(new Date(activatedAt).getTime() + BATCH_DAYS * 86400000) : null);

const publicBatch = (batch) => ({
  id:    batch.id,
  name:  batch.name,
  exam:  batch.exam,
  grade: batch.grade,
  price: batch.price,
});

const publicSubscription = (sub) =>
  sub
    ? {
        status:      sub.status, // "pending" | "active" | "expired"
        batch:       publicBatch(sub.batch),
        activatedAt: sub.activatedAt,
        expiresAt:   batchEndsAt(sub.activatedAt),
      }
    : null;

const publicUser = (user) => ({
  id:           user.id,
  name:         user.name,
  email:        user.email,
  role:         user.role,
  exam:         user.exam,
  phone:        user.phone,
  grade:        user.grade,
  targetYear:   user.targetYear,
  state:        user.state,
  city:         user.city,
  subscription: publicSubscription(user.subscription),
});

module.exports = { WITH_SUBSCRIPTION, BATCH_DAYS, batchEndsAt, publicBatch, publicSubscription, publicUser };
