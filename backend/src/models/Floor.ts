import mongoose, { Document, Schema } from 'mongoose';

export interface IFloor extends Document {
  name: string;
}

const floorSchema = new Schema<IFloor>(
  { name: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);

export default mongoose.model<IFloor>('Floor', floorSchema);
