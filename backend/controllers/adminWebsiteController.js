const prisma = require('../lib/prisma')

// Get website settings
exports.getWebsiteSettings = async (req, res) => {
  try {
    let settings = await prisma.websiteSettings.findFirst()

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.websiteSettings.create({
        data: {
          announcement: '',
          showAnnouncement: false,
          youtubeChannel: '',
          youtubePlaylists: {},
        },
      })
    }

    res.json({
      announcement: settings.announcement,
      showAnnouncement: settings.showAnnouncement,
      channel: settings.youtubeChannel,
      playlists: settings.youtubePlaylists || {},
      guessSeconds: settings.guessSeconds,
      slowSeconds: settings.slowSeconds,
      reportNotice: settings.reportNotice,
    })
  } catch (error) {
    console.error('Error fetching website settings:', error)
    res.status(500).json({ error: 'Failed to fetch website settings' })
  }
}

// Update website settings
exports.updateWebsiteSettings = async (req, res) => {
  try {
    const { announcement, showAnnouncement, channel, playlists, guessSeconds, slowSeconds, reportNotice } = req.body

    // After-test analysis settings: whole seconds in a sensible range
    const seconds = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
    if (guessSeconds !== undefined && !seconds(guessSeconds, 5, 300)) return res.status(400).json({ field: 'guessSeconds', error: 'The guess time must be a whole number of seconds from 5 to 300.' })
    if (slowSeconds !== undefined && !seconds(slowSeconds, 30, 1800)) return res.status(400).json({ field: 'slowSeconds', error: 'The slow-question time must be a whole number of seconds from 30 to 1800.' })
    if (reportNotice !== undefined && typeof reportNotice !== 'boolean') return res.status(400).json({ field: 'reportNotice', error: 'reportNotice must be true or false.' })

    let settings = await prisma.websiteSettings.findFirst()

    // When only one of the two times is sent, compare it with the stored other one
    if (guessSeconds !== undefined || slowSeconds !== undefined) {
      const guess = guessSeconds !== undefined ? guessSeconds : settings ? settings.guessSeconds : 30
      const slow = slowSeconds !== undefined ? slowSeconds : settings ? settings.slowSeconds : 180
      if (slow <= guess) return res.status(400).json({ field: 'slowSeconds', error: 'The slow-question time must be longer than the guess time.' })
    }

    // Only the fields the caller sent are written: saving the video links
    // must not clear the announcement, and vice versa.
    const data = {}
    if (announcement !== undefined) data.announcement = announcement
    if (showAnnouncement !== undefined) data.showAnnouncement = showAnnouncement
    if (channel !== undefined) data.youtubeChannel = channel
    if (playlists !== undefined) data.youtubePlaylists = playlists
    if (guessSeconds !== undefined) data.guessSeconds = guessSeconds
    if (slowSeconds !== undefined) data.slowSeconds = slowSeconds
    if (reportNotice !== undefined) data.reportNotice = reportNotice

    if (settings) {
      // Update existing settings
      settings = await prisma.websiteSettings.update({
        where: { id: settings.id },
        data,
      })
    } else {
      // Create new settings
      settings = await prisma.websiteSettings.create({
        data: {
          announcement: '',
          showAnnouncement: false,
          youtubeChannel: '',
          youtubePlaylists: {},
          ...data,
        },
      })
    }

    res.json({
      announcement: settings.announcement,
      showAnnouncement: settings.showAnnouncement,
      channel: settings.youtubeChannel,
      playlists: settings.youtubePlaylists,
      guessSeconds: settings.guessSeconds,
      slowSeconds: settings.slowSeconds,
      reportNotice: settings.reportNotice,
    })
  } catch (error) {
    console.error('Error updating website settings:', error)
    res.status(500).json({ error: 'Failed to update website settings' })
  }
}
