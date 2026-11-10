-- CreateTable
CREATE TABLE "WebsiteSettings" (
    "id" TEXT NOT NULL,
    "announcement" TEXT NOT NULL DEFAULT '',
    "showAnnouncement" BOOLEAN NOT NULL DEFAULT false,
    "youtubeChannel" TEXT NOT NULL DEFAULT '',
    "youtubePlaylists" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteSettings_pkey" PRIMARY KEY ("id")
);
