document.getElementById("download").addEventListener("click", () => {
  chrome.runtime.sendMessage(
    { action: "delegate_download" },
    function (response) {
      console.log(response);
    }
  );
});
