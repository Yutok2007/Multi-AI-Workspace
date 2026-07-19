import { bootstrapContent } from './bootstrap';
import { logger } from '../shared/logger/logger';

void bootstrapContent().catch((error: unknown) => {
  logger.error('CONTENT_BOOTSTRAP_FAILED', 'The extension UI could not initialize on this page.', {
    error,
  });
});
