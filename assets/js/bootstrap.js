/* Bootstrap shared scripts on every page */

import { initCommon } from './app.js';
import './notifications.js';
import './assistant.js';

document.addEventListener('DOMContentLoaded', () => {
  const disable = document.body && document.body.dataset && document.body.dataset.disableToasts === 'true';
  initCommon({ disableToasts: disable });
});
