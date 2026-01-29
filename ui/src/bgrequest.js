export function bgRequest(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (!response) {
        reject("No response from background");
        return;
      }
      if (response.ok) resolve(response.data);
      else reject(response.error);
    });
  });
}


