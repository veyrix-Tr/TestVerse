const prisma = require('../lib/prisma');
const { running, audiencesFor, viewer } = require('../lib/announce');

// What the public site and the signed-in student read. Admin-side writing
// lives in adminContentController.js.

const publicResource = (r) => ({
  id: r.id,
  title: r.title,
  videoId: r.videoId,
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

// GET /api/resources — published resources for the homepage "Resources"
// section, in the order the admin put them (public).
const listResources = async (req, res) => {
  try {
    const rows = await prisma.resource.findMany({
      where:   { isPublished: true },
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
    const a = await prisma.announcement.findFirst({
      where:   { ...running(), audience: 'all' },
      orderBy: { startsAt: 'desc' },
    });
    res.json({ announcement: a ? publicAnnouncement(a, false) : null });
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

module.exports = { listResources, listAnnouncements, myAnnouncements, markRead };
