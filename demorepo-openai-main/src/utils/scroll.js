/**
 * Smoothly scrolls the active viewport container to the top.
 * Supports both the dashboard layout main container and the main window viewport.
 */
export const scrollToTop = () => {
  const container = document.getElementById('main-workspace-container');
  if (container) {
    container.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
