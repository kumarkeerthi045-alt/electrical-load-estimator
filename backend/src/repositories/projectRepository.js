import { config } from '../config/env.js';
import { databaseReady } from '../config/db.js';
import { Project } from '../models/Project.js';
import { createFileStore } from './fileStore.js';

/**
 * One repository interface, two backends:
 *   - MongoDB (Mongoose) when MONGO_URI is set and connected
 *   - a JSON file store otherwise
 * Controllers never care which one is live.
 */
let fileStore = null;

function file() {
  if (!fileStore) fileStore = createFileStore(config.dataDir);
  return fileStore;
}

export function storeKind() {
  return databaseReady() ? 'mongodb' : 'file';
}

const plain = (doc) => (doc && typeof doc.toJSON === 'function' ? doc.toJSON() : doc);

export const projectRepository = {
  async list({ limit = 50 } = {}) {
    if (databaseReady()) {
      const docs = await Project.find().sort({ updatedAt: -1 }).limit(limit).lean({ virtuals: true });
      return docs.map((d) => ({ ...d, id: String(d._id), _id: undefined }));
    }
    return file().list({ limit });
  },

  async findById(id) {
    if (databaseReady()) {
      if (!id?.match(/^[0-9a-fA-F]{24}$/)) return null;
      return plain(await Project.findById(id));
    }
    return file().findById(id);
  },

  async create(data) {
    if (databaseReady()) return plain(await Project.create(data));
    return file().create(data);
  },

  async update(id, patch) {
    if (databaseReady()) {
      if (!id?.match(/^[0-9a-fA-F]{24}$/)) return null;
      return plain(await Project.findByIdAndUpdate(id, patch, { new: true, runValidators: true }));
    }
    return file().update(id, patch);
  },

  async remove(id) {
    if (databaseReady()) {
      if (!id?.match(/^[0-9a-fA-F]{24}$/)) return false;
      const res = await Project.findByIdAndDelete(id);
      return Boolean(res);
    }
    return file().remove(id);
  },
};
