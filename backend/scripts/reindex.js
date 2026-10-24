import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import esClient from '../src/config/es.js';
import Product from '../src/models/product.model.js';
import { ensureIndex, formatProductForES } from '../src/services/search.service.js';

/**
 * Rebuild the entire Elasticsearch index from MongoDB
 * Drops and recreates the index, then bulk-indexes all active products in batches of 500.
 */
export const rebuildIndex = async (targetIndex = env.esIndex) => {
  console.log(`[Reindex] Starting full reindex for index '${targetIndex}'...`);

  // Ensure index is dropped and recreated with fresh mappings
  await ensureIndex(targetIndex, { recreate: true });

  const batchSize = 500;
  let totalIndexed = 0;
  let currentBatch = [];

  const cursor = Product.find({ isActive: true })
    .populate('vendorId', 'storeName')
    .lean()
    .cursor();

  for await (const product of cursor) {
    const formatted = await formatProductForES(product);
    currentBatch.push(formatted);

    if (currentBatch.length >= batchSize) {
      const operations = currentBatch.flatMap((doc) => [
        { index: { _index: targetIndex, _id: doc.id } },
        doc,
      ]);

      const bulkRes = await esClient.bulk({ refresh: true, operations });
      if (bulkRes.errors) {
        console.warn('[Reindex] Some documents had errors during bulk indexing');
      }

      totalIndexed += currentBatch.length;
      console.log(`[Reindex] Indexed ${totalIndexed} products...`);
      currentBatch = [];
    }
  }

  // Index any remaining products in the final batch
  if (currentBatch.length > 0) {
    const operations = currentBatch.flatMap((doc) => [
      { index: { _index: targetIndex, _id: doc.id } },
      doc,
    ]);

    const bulkRes = await esClient.bulk({ refresh: true, operations });
    if (bulkRes.errors) {
      console.warn('[Reindex] Some documents had errors during bulk indexing');
    }

    totalIndexed += currentBatch.length;
  }

  // Refresh index so all documents are immediately searchable
  await esClient.indices.refresh({ index: targetIndex }).catch(() => {});

  console.log(`[Reindex] Successfully rebuilt index '${targetIndex}'. Total active products indexed: ${totalIndexed}`);
  return totalIndexed;
};

// If run directly from command line
const run = async () => {
  try {
    await connectDB();
    await rebuildIndex();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Reindex] Fatal reindexing error:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

// Check if executed directly
if (process.argv[1] && process.argv[1].endsWith('reindex.js')) {
  run();
}
