/**
 * One-time cleanup: delete all recurring templates named "haha"
 * and their associated occurrences.
 * Run: node server/scripts/cleanup-haha.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')

const RecurringGuide = require('../src/models/RecurringGuide')
const GuideOccurrence = require('../src/models/GuideOccurrence')

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  // Find all templates with programName "haha" (case-insensitive)
  const templates = await RecurringGuide.find({
    programName: { $regex: /^haha$/i }
  }).lean()

  console.log(`Found ${templates.length} template(s) named "haha"`)

  for (const tmpl of templates) {
    const delOcc = await GuideOccurrence.deleteMany({ templateId: tmpl._id })
    await RecurringGuide.findByIdAndDelete(tmpl._id)
    console.log(`  Deleted template ${tmpl._id} (producer: ${tmpl.producerId}) + ${delOcc.deletedCount} occurrences`)
  }

  // Also delete any occurrences still named "haha" regardless of template
  const byName = await GuideOccurrence.deleteMany({
    programName: { $regex: /^haha$/i }
  })
  console.log(`Deleted ${byName.deletedCount} occurrence(s) named "haha" by programName`)

  // Also delete any orphaned occurrences (no matching template)
  const allTemplateIds = (await RecurringGuide.find({}, { _id: 1 }).lean()).map(t => t._id)
  const orphaned = await GuideOccurrence.deleteMany({
    templateId: { $nin: allTemplateIds },
    status: { $in: ['PLANNED', 'LATE', 'DISABLED'] }
  })
  console.log(`Deleted ${orphaned.deletedCount} orphaned occurrence(s) (no matching template)`)

  console.log('Done.')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
