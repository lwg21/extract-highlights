// Check if app.js is connected upon HTML load
document.addEventListener("DOMContentLoaded", () => {
  console.log("app.js connected")
});

// Open uploaded file
const fileSelector = document.querySelector("#file-selector");
fileSelector.addEventListener("change", (event) => {
  console.log(event.target.files[0]);
});


// Drag-and-drop area
const dropArea = document.querySelector("#drop-area")

dropArea.addEventListener("dragenter", (event) => {
  dropArea.style.backgroundColor = "green";
});

dropArea.addEventListener("dragleave", (event) => {
  dropArea.style.backgroundColor = "lightgrey";
});

dropArea.addEventListener('dragover', (event) => {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

dropArea.addEventListener("drop", (event) => {
  event.stopPropagation();
  event.preventDefault();
  dropArea.style.backgroundColor = "yellow";
  const fileList = event.dataTransfer.files;
  console.log(fileList[0]);
});
