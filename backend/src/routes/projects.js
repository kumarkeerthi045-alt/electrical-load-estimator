import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { buildReport } from '../services/estimateService.js';
import { validateProjectInput } from '../middleware/validateProject.js';

export const projectsRouter = Router();

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 200)
      : 50;
    const projects = await projectRepository.list({ limit });
    res.json({ projects, count: projects.length });
  }),
);

projectsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = validateProjectInput(req.body);
    const project = await projectRepository.create({
      ...payload,
      loads: payload.loads ?? [],
      settings: payload.settings ?? {},
      lastReport: buildReport({ loads: payload.loads ?? [], settings: payload.settings ?? {} }),
    });
    res.status(201).json(project);
  }),
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const project = await projectRepository.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  }),
);

projectsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = validateProjectInput(req.body, { partial: true });
    const existing = await projectRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const loads = payload.loads ?? existing.loads ?? [];
    const settings = { ...(existing.settings || {}), ...(payload.settings || {}) };
    const project = await projectRepository.update(req.params.id, {
      ...payload,
      loads,
      settings,
      lastReport: buildReport({ loads, settings }),
    });
    res.json(project);
  }),
);

projectsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const removed = await projectRepository.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Project not found' });
    res.status(204).end();
  }),
);

/** POST /api/projects/:id/estimate — recompute and store the latest report. */
projectsRouter.post(
  '/:id/estimate',
  asyncHandler(async (req, res) => {
    const existing = await projectRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const payload = validateProjectInput(
      { name: 'adhoc', ...req.body },
      { partial: true },
    );
    const loads = payload.loads ?? existing.loads ?? [];
    const settings = { ...(existing.settings || {}), ...(payload.settings || {}) };
    const report = buildReport({ loads, settings });
    await projectRepository.update(req.params.id, { loads, settings, lastReport: report });
    res.json(report);
  }),
);
