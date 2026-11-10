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
    })
  } catch (error) {
    console.error('Error fetching website settings:', error)
    res.status(500).json({ error: 'Failed to fetch website settings' })
  }
}

// Update website settings
exports.updateWebsiteSettings = async (req, res) => {
  try {
    const { announcement, showAnnouncement, channel, playlists } = req.body

    let settings = await prisma.websiteSettings.findFirst()

    // Only the fields the caller sent are written: saving the video links
    // must not clear the announcement, and vice versa.
    const data = {}
    if (announcement !== undefined) data.announcement = announcement
    if (showAnnouncement !== undefined) data.showAnnouncement = showAnnouncement
    if (channel !== undefined) data.youtubeChannel = channel
    if (playlists !== undefined) data.youtubePlaylists = playlists

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
    })
  } catch (error) {
    console.error('Error updating website settings:', error)
    res.status(500).json({ error: 'Failed to update website settings' })
  }
}
