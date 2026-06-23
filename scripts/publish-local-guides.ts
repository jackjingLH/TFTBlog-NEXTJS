import { prepareGuidePublishPayload } from '../lib/guide-publisher';
import { openGuideContentStore } from '../lib/guide-content-store';

const guides = [
  'content/guides/gwen-pyke/TFT.md',
  'content/guides/hedge-fund/TFT.md',
  'content/guides/jax-jinx/TFT.md',
  'content/guides/viktor-nami/TFT.md',
];

async function publishLocalGuides() {
  const store = await openGuideContentStore();

  for (const markdownPath of guides) {
    console.log(`Publishing ${markdownPath}...`);

    try {
      const result = await prepareGuidePublishPayload({
        markdownPath,
        localOnly: true,
        assetRoots: [],
      });

      await store.upsertGuide(result.payload);
      console.log(`✓ Published: ${result.slug}`);
    } catch (error) {
      console.error(`✗ Failed to publish ${markdownPath}:`, error);
    }
  }

  await store.close();
  console.log('\nAll guides published!');
}

publishLocalGuides().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
