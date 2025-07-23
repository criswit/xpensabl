console.log('Content script loaded on:', window.location.href);

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('DOM changed:', mutation);
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});