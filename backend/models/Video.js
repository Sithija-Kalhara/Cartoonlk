const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: String,
  name: String,
  category: [String],
  country: [{ type: String, trim: true }],
  duration: String,
  imdbRating: Number,
  tags: {
  type: [String],
},
  releaseDate: String,
  season: { type: Number, default: null },
  episode: { type: Number, default: null },
  qualities: [{ label: String, filename: String }], 
  thumbnail: String,
  landscapeThumbnail: { type: String },
  subtitle: String,
  photo1: String,
  description1: String,
  photo2: String,
  description2: String,
  photo3: String,
  description3: String,
  photo4: String,
  description4: String,
  warning: String,
  qualityNotice: String,
  downloadLink: String,
  director: String,
  trailer: { type: String, default: "" },
  actors: [{ name: String, photo: String }],
  dubbing: [{ name: String, photo: String }],
  createdAt: { type: Date, default: Date.now }
});

videoSchema.index({ title: 1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ name: 1 });
videoSchema.index({ season: 1 });
videoSchema.index({ episode: 1 });

module.exports = mongoose.models.Video || mongoose.model('Video', videoSchema);
