import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  color: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    color: { type: String, required: true, default: '#6366f1' },
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>('Category', categorySchema);
