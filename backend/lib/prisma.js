// lib/prisma.js
// Creates a single shared PrismaClient instance for the whole app.
// We do this because creating a new client on every request wastes memory.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
