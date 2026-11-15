-- When an announcement's bells went out. One scheduled for later sends them
-- once it starts (lib/upkeep.js); null = not sent yet.
ALTER TABLE "Announcement" ADD COLUMN "notifiedAt" TIMESTAMP(3);

-- Announcements that have already started sent theirs when they were published.
UPDATE "Announcement" SET "notifiedAt" = "startsAt" WHERE "startsAt" <= (now() AT TIME ZONE 'UTC');
