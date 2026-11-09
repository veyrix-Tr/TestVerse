const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/adminStudentsController');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/students', c.listStudents);
router.get('/students/:id', c.getStudent);
router.post('/students/:id/tests', c.giveTestToStudent);
router.delete('/students/:id/tests/:testId', c.takeTestFromStudent);

router.get('/groups', c.listGroups);
router.post('/groups', c.createGroup);
router.get('/groups/:id', c.getGroup);
router.put('/groups/:id', c.updateGroup);
router.post('/groups/:id/members', c.addMembers);
router.delete('/groups/:id/members/:userId', c.removeMember);
router.post('/groups/:id/tests', c.giveTestToGroup);
router.delete('/groups/:id/tests/:testId', c.takeTestFromGroup);
router.delete('/groups/:id', c.deleteGroup);

router.get('/batches', c.listBatches);

module.exports = router;
