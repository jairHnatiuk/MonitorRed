// =============================================
// routes/hosts.js
// API REST para el ABM de hosts
// =============================================

const express = require('express');
const router  = express.Router();
const hostsDB = require('../db/hosts');

// Helper para respuestas de error
const fail = (res, status, msg) => res.status(status).json({ ok: false, error: msg });

// GET /api/hosts          — lista todos los hosts
router.get('/', (req, res) => {
    try {
        res.json({ ok: true, hosts: hostsDB.getAll() });
    } catch (e) {
        fail(res, 500, e.message);
    }
});

// GET /api/hosts/grupos   — lista grupos únicos
router.get('/grupos', (req, res) => {
    try {
        res.json({ ok: true, grupos: hostsDB.getGrupos() });
    } catch (e) {
        fail(res, 500, e.message);
    }
});

// GET /api/hosts/:id      — un host por ID
router.get('/:id', (req, res) => {
    try {
        const host = hostsDB.getById(Number(req.params.id));
        if (!host) return fail(res, 404, 'Host no encontrado.');
        res.json({ ok: true, host });
    } catch (e) {
        fail(res, 500, e.message);
    }
});

// POST /api/hosts         — crear host
router.post('/', (req, res) => {
    try {
        const { ip, nombre, grupo } = req.body;
        const result = hostsDB.crear({ ip, nombre, grupo });
        res.status(201).json({ ok: true, id: result.lastInsertRowid });
    } catch (e) {
        // Unique constraint viola la IP duplicada
        if (e.message.includes('UNIQUE')) return fail(res, 409, `La IP "${req.body.ip}" ya existe.`);
        fail(res, 400, e.message);
    }
});

// PUT /api/hosts/:id      — actualizar host
router.put('/:id', (req, res) => {
    try {
        hostsDB.actualizar(Number(req.params.id), req.body);
        res.json({ ok: true });
    } catch (e) {
        if (e.message.includes('UNIQUE')) return fail(res, 409, `La IP "${req.body.ip}" ya está en uso.`);
        if (e.message.includes('no encontrado')) return fail(res, 404, e.message);
        fail(res, 400, e.message);
    }
});

// PATCH /api/hosts/:id/activo — habilitar/deshabilitar
router.patch('/:id/activo', (req, res) => {
    try {
        const { activo } = req.body;
        if (activo === undefined) return fail(res, 400, 'Falta el campo "activo".');
        hostsDB.setActivo(Number(req.params.id), activo);
        res.json({ ok: true });
    } catch (e) {
        fail(res, 400, e.message);
    }
});

// DELETE /api/hosts/:id   — eliminar host
router.delete('/:id', (req, res) => {
    try {
        const result = hostsDB.eliminar(Number(req.params.id));
        if (result.changes === 0) return fail(res, 404, 'Host no encontrado.');
        res.json({ ok: true });
    } catch (e) {
        fail(res, 500, e.message);
    }
});

module.exports = router;