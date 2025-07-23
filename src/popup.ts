import { logger } from './services/chromeLogger';

document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('clickMe');
  const sidePanelButton = document.getElementById('openSidePanel');
  const output = document.getElementById('output');

  button?.addEventListener('click', () => {
    output!.textContent = 'Hello from TypeScript Chrome Extension!';
  });

  sidePanelButton?.addEventListener('click', () => {
    // Open the side panel using chrome.runtime.sendMessage
    chrome.runtime.sendMessage({ action: 'openSidePanel' }, (_response) => {
      if (chrome.runtime.lastError) {
        logger.error('Error:', chrome.runtime.lastError);
        output!.textContent = 'Error opening side panel';
      } else {
        output!.textContent = 'Side panel opened!';
      }
    });
  });
});
