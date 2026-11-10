const prisma = require('../lib/prisma')

async function seedWebsiteSettings() {
  console.log('Seeding website settings...')

  const existing = await prisma.websiteSettings.findFirst()

  if (!existing) {
    await prisma.websiteSettings.create({
      data: {
        announcement: '',
        showAnnouncement: false,
        youtubeChannel: '',
        youtubePlaylists: {},
      },
    })
    console.log('✓ Website settings created')
  } else {
    console.log('✓ Website settings already exist')
  }
}

module.exports = seedWebsiteSettings
