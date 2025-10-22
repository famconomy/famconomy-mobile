import { runConsolidationJob } from '../src/services/memoryService';

runConsolidationJob()
  .then(() => {
    console.log('Consolidation job completed.');
  })
  .catch((err) => {
    console.error('Error running consolidation job:', err);
  });
