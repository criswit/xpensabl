import { logger } from './services/chromeLogger';

logger.info('Content script loaded on:', window.location.href);

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    logger.debug('DOM changed:', mutation);
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
