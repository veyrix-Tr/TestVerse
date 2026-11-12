const prisma = require('../lib/prisma');
const { running, audiencesFor, viewer } = require('../lib/announce');

// What the public site and the signed-in student read. Admin-side writing
// lives in adminContentController.js.

const publicResource = (r) => ({
  id: r.id,
  title: r.title,
  videoId: r.videoId,
  kind: r.kind || 'video',
  exam: r.exam,
  topic: r.topic,
});

const publicAnnouncement = (a, read) => ({
  id: a.id,
  body: a.body,
  link: a.link,
  audience: a.audience,
  startsAt: a.startsAt,
  read: !!read,
});

const RES_ORDER = [{ sortOrder: 'asc' }, { createdAt: 'asc' }];

// GET /api/resources — the homepage "Resources" section: published videos
// meant for everyone (no exam), in the admin's order (public). Exam videos
// are only for signed-in students of that exam, via /resources/mine.
const listResources = async (req, res) => {
  try {
    const rows = await prisma.resource.findMany({
      where:   { isPublished: true, exam: null },
      orderBy: RES_ORDER,
    });
    res.json({ resources: rows.map(publicResource) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load resources' });
  }
};

// GET /api/resources/mine — the student's Resources page: published videos
// for everyone plus those for the exam the student is preparing for.
const myResources = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { exam: true } });
    const exams = [null, ...(user && user.exam ? [user.exam] : [])];
    const rows = await prisma.resource.findMany({
      where:   { isPublished: true, OR: exams.map((exam) => ({ exam })) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ resources: rows.map(publicResource) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load resources' });
  }
};

// GET /api/announcements — what a visitor sees on the homepage strip: the
// newest running announcement meant for everybody (public, no token).
const listAnnouncements = async (req, res) => {
  try {
    const rows = await prisma.announcement.findMany({
      where:   { ...running(), audience: 'all' },
      orderBy: { startsAt: 'desc' },
      take: 20,
    });
    res.json({
      announcement: rows[0] ? publicAnnouncement(rows[0], false) : null,
      announcements: rows.map((a) => publicAnnouncement(a, false)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load announcements' });
  }
};

// GET /api/announcements/mine — everything running that this student's exam
// and batch make visible, newest first, each flagged read / unread.
const myAnnouncements = async (req, res) => {
  try {
    const who = await viewer(req.user.id);
    const rows = await prisma.announcement.findMany({
      where:   { ...running(), audience: { in: audiencesFor(who) } },
      orderBy: { startsAt: 'desc' },
      include: { reads: { where: { userId: req.user.id }, select: { readAt: true } } },
    });
    res.json({ announcements: rows.map((a) => publicAnnouncement(a, a.reads.length > 0)) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load announcements' });
  }
};

// POST /api/announcements/:id/read — the student closed the banner, so the
// admin's "N of M read" count moves up. Idempotent.
const markRead = async (req, res) => {
  try {
    const id = req.params.id;
    const a = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
    if (!a) return res.status(404).json({ error: 'Announcement not found' });
    await prisma.announcementRead.upsert({
      where:   { announcementId_userId: { announcementId: id, userId: req.user.id } },
      update:  {},
      create:  { announcementId: id, userId: req.user.id },
    });
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not mark as read' });
  }
};

// POST /api/announcements/read — the bell's "Mark all read": every running
// announcement this student can see counts as read.
const markAllRead = async (req, res) => {
  try {
    const who = await viewer(req.user.id);
    const rows = await prisma.announcement.findMany({
      where:  { ...running(), audience: { in: audiencesFor(who) } },
      select: { id: true },
    });
    if (rows.length) {
      await prisma.announcementRead.createMany({
        data: rows.map((a) => ({ announcementId: a.id, userId: req.user.id })),
        skipDuplicates: true,
      });
    }
    res.json({ message: 'All announcements read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update announcements' });
  }
};

// --------------------------------------------------- the student's own bell

const notificationOf = (n) => ({
  id: n.id,
  type: n.type,
  text: n.text,
  view: n.view,
  read: !!n.readAt,
  createdAt: n.createdAt,
});

// GET /api/notifications/mine — this student's rows only (userId = them),
// newest 30 + how many are unread. Admin rows are never returned here.
const myNotifications = async (req, res) => {
  try {
    const [rows, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
    ]);
    res.json({ notifications: rows.map(notificationOf), unread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not load notifications' });
  }
};

// POST /api/notifications/:id/read — one of this student's (404 if not theirs)
const markNotificationRead = async (req, res) => {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data:  { readAt: new Date() },
    });
    if (!count) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update the notification' });
  }
};

// POST /api/notifications/read — the bell's "Mark all read"
const markAllNotificationsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data:  { readAt: new Date() },
    });
    res.json({ message: 'All notifications read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not update notifications' });
  }
};

module.exports = {
  listResources,
  myResources,
  listAnnouncements,
  myAnnouncements,
  markRead,
  markAllRead,
  myNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
