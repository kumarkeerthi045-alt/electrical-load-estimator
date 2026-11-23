import mongoose from 'mongoose';

const { Schema } = mongoose;

const loadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    ratedKw: { type: Number, required: true, min: 0.001 },
    powerFactor: { type: Number, default: 0.85, min: 0.01, max: 1 },
    demandFactor: { type: Number, default: 1, min: 0.01, max: 1 },
    phases: { type: Number, default: 3, enum: [1, 3] },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    voltage: { type: Number, default: 415, min: 100, max: 11000 },
    phases: { type: Number, default: 3, enum: [1, 3] },
    diversityFactor: { type: Number, default: 1, min: 1, max: 5 },
    derating: { type: Number, default: 1, min: 0.1, max: 1 },
    maxVdPct: { type: Number, default: 3, min: 0.5, max: 10 },
    cableLengthM: { type: Number, default: 50, min: 1, max: 5000 },
    maxRuns: { type: Number, default: 4, min: 1, max: 8 },
    maxLoading: { type: Number, default: 0.8, min: 0.2, max: 1 },
    futureMargin: { type: Number, default: 0.2, min: 0, max: 1 },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    client: { type: String, trim: true, maxlength: 160, default: '' },
    site: { type: String, trim: true, maxlength: 160, default: '' },
    notes: { type: String, maxlength: 4000, default: '' },
    loads: { type: [loadSchema], default: [] },
    settings: { type: settingsSchema, default: () => ({}) },
    lastReport: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

projectSchema.index({ updatedAt: -1 });

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export { loadSchema, settingsSchema };
